import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient, getAuthClient } from "../_shared/supabase.ts";

const FN = "[build-quote]";

const AGENCY_COMMISSION_RATE = 0.15;
const QUOTE_VALIDITY_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────────
// JWT extraction helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractJwtPayload(
  authHeader: string,
): Record<string, unknown> | null {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Base64url decode the payload
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform inference from content type
// ─────────────────────────────────────────────────────────────────────────────

function platformForContentType(contentType: string): string {
  if (contentType.startsWith("ig_")) return "instagram";
  if (contentType.startsWith("tiktok_")) return "tiktok";
  if (contentType.startsWith("yt_")) return "youtube";
  if (contentType.startsWith("x_")) return "twitter";
  if (
    contentType === "appearance" ||
    contentType === "podcast" ||
    contentType === "blog_post"
  ) {
    return "offline";
  }
  return "other";
}

serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    // ── Extract and verify JWT ──────────────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader) {
      return errorResponse("Authorization header required", 401);
    }

    const jwtPayload = extractJwtPayload(authHeader);
    if (!jwtPayload || !jwtPayload.sub) {
      return errorResponse("Invalid token", 401);
    }

    const userId = jwtPayload.sub as string;

    // ── Verify user exists in user_profiles ─────────────────────────────
    const supabase = getServiceClient();

    const { data: userProfile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (profileErr || !userProfile) {
      return errorResponse("User not found", 403);
    }

    // ── Parse and validate inputs ───────────────────────────────────────
    const body = await req.json();
    const {
      brand_id,
      athlete_id,
      deliverables,
      timeline_days,
      budget_band,
    } = body;

    if (!brand_id) {
      return errorResponse("brand_id is required", 400);
    }

    if (!athlete_id) {
      return errorResponse("athlete_id is required", 400);
    }

    if (
      !deliverables ||
      !Array.isArray(deliverables) ||
      deliverables.length === 0
    ) {
      return errorResponse(
        "At least one deliverable is required",
        400,
      );
    }

    // Validate each deliverable has type and quantity
    for (const d of deliverables) {
      if (!d.type || !d.quantity || d.quantity < 1) {
        return errorResponse(
          "Each deliverable must have a type and quantity >= 1",
          400,
        );
      }
    }

    // ── Fetch athlete's latest valuation ────────────────────────────────
    const { data: latestValuation, error: valErr } = await supabase
      .from("athlete_valuations")
      .select("*")
      .eq("athlete_id", athlete_id)
      .order("as_of", { ascending: false })
      .limit(1)
      .single();

    if (valErr || !latestValuation) {
      return errorResponse(
        "No valuation found for this athlete. Run a valuation snapshot first.",
        404,
      );
    }

    // ── Fetch brand profile ─────────────────────────────────────────────
    const { data: brand, error: brandErr } = await supabase
      .from("brands")
      .select("id, name, category, budget_tier, status")
      .eq("id", brand_id)
      .single();

    if (brandErr || !brand) {
      return errorResponse("Brand not found", 404);
    }

    // ── Fetch brand's recent signal activity ────────────────────────────
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { count: recentSignalCount } = await supabase
      .from("brand_signals")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brand_id)
      .gte("detected_at", thirtyDaysAgo);

    const hasRecentSignals = (recentSignalCount || 0) > 0;

    // ── Extract per-post rates from valuation data ──────────────────────
    const valuationData = latestValuation.valuation_data as Record<
      string,
      unknown
    > | null;

    // Build a lookup map from valuation per_post rates
    const perPostMap = new Map<
      string,
      { rate_low: number; rate_high: number }
    >();

    if (valuationData?.per_post) {
      const perPost = valuationData.per_post as Record<
        string,
        Array<Record<string, unknown>>
      >;
      for (const [, rates] of Object.entries(perPost)) {
        for (const rate of rates) {
          perPostMap.set(rate.content_type as string, {
            rate_low: rate.rate_low as number,
            rate_high: rate.rate_high as number,
          });
        }
      }
    }

    // ── Determine brand-specific pricing adjustment ─────────────────────
    // Active signals -> upper half of range
    // Major budget tier -> 10% premium for usage rights
    // Cold brand -> lower half, conservative
    let pricingBias: "upper" | "lower" | "neutral" = "neutral";
    let usageRightsPremium = 0;

    if (hasRecentSignals) {
      pricingBias = "upper";
    } else {
      pricingBias = "lower";
    }

    if (
      brand.budget_tier === "established" ||
      brand.budget_tier === "elite"
    ) {
      usageRightsPremium = 0.10;
    }

    // ── Build line items ────────────────────────────────────────────────
    interface LineItem {
      type: string;
      platform: string;
      quantity: number;
      unit_rate_low: number;
      unit_rate_high: number;
      total_low: number;
      total_high: number;
    }

    const lineItems: LineItem[] = [];

    for (const d of deliverables) {
      const contentType = d.type as string;
      const quantity = d.quantity as number;
      const platform = platformForContentType(contentType);

      // Look up rate from valuation
      let rateLow = 50;
      let rateHigh = 200;

      const rate = perPostMap.get(contentType);
      if (rate) {
        rateLow = rate.rate_low;
        rateHigh = rate.rate_high;
      }

      // Apply brand-specific adjustment
      if (pricingBias === "upper") {
        const mid = (rateLow + rateHigh) / 2;
        rateLow = Math.round(mid);
        // rateHigh stays the same (upper half)
      } else if (pricingBias === "lower") {
        const mid = (rateLow + rateHigh) / 2;
        rateHigh = Math.round(mid);
        // rateLow stays the same (lower half)
      }

      // Apply usage rights premium
      if (usageRightsPremium > 0) {
        rateLow = Math.round(rateLow * (1 + usageRightsPremium));
        rateHigh = Math.round(rateHigh * (1 + usageRightsPremium));
      }

      lineItems.push({
        type: contentType,
        platform,
        quantity,
        unit_rate_low: rateLow,
        unit_rate_high: rateHigh,
        total_low: rateLow * quantity,
        total_high: rateHigh * quantity,
      });
    }

    // ── Calculate totals ────────────────────────────────────────────────
    const subtotalLow = lineItems.reduce((s, li) => s + li.total_low, 0);
    const subtotalHigh = lineItems.reduce(
      (s, li) => s + li.total_high,
      0,
    );

    const agencyCommissionLow = Math.round(
      subtotalLow * AGENCY_COMMISSION_RATE,
    );
    const agencyCommissionHigh = Math.round(
      subtotalHigh * AGENCY_COMMISSION_RATE,
    );

    const totalLow = subtotalLow + agencyCommissionLow;
    const totalHigh = subtotalHigh + agencyCommissionHigh;

    // ── Build quote object ──────────────────────────────────────────────
    const validUntil = new Date(
      Date.now() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const quote = {
      brand_id,
      brand_name: brand.name,
      athlete_id,
      deliverables: lineItems,
      subtotal_low: subtotalLow,
      subtotal_high: subtotalHigh,
      agency_commission_rate: AGENCY_COMMISSION_RATE,
      agency_commission_low: agencyCommissionLow,
      agency_commission_high: agencyCommissionHigh,
      total_low: totalLow,
      total_high: totalHigh,
      currency: "USD",
      valid_until: validUntil,
      pricing_basis: {
        valuation_date: latestValuation.as_of,
        confidence: latestValuation.confidence,
        follower_tier: latestValuation.follower_tier,
        brand_signal_activity: hasRecentSignals ? "active" : "cold",
        usage_rights_premium: usageRightsPremium > 0,
      },
    };

    // ── Build negotiation pack ──────────────────────────────────────────
    const negotiationPack = {
      quote_summary: {
        athlete_id,
        brand_id,
        brand_name: brand.name,
        total_range: `$${totalLow.toLocaleString()} - $${totalHigh.toLocaleString()}`,
        valid_until: validUntil,
      },
      deliverables_breakdown: lineItems,
      usage_rights: {
        timeline_days: timeline_days || 30,
        type: usageRightsPremium > 0
          ? "Paid media whitelisting included"
          : "Organic usage only",
        notes:
          "Usage rights are limited to the specified timeline. Extended usage requires renegotiation.",
      },
      exclusivity: {
        scope: "Category exclusivity recommended for premium packages",
        duration_days: timeline_days || 30,
        notes:
          "Exclusivity prevents the athlete from partnering with competing brands in the same product category during the term.",
      },
      validity: {
        period_days: QUOTE_VALIDITY_DAYS,
        expires: validUntil,
        notes:
          "This quote is valid for 30 days from generation. Rates may change after expiration based on market conditions.",
      },
      disclaimer:
        "This quote is an estimate based on current market data and athlete valuation metrics. " +
        "Final deal terms are subject to negotiation between all parties. " +
        "Agency commission is included in the total. " +
        "All amounts are in USD. Tax implications are the responsibility of each party.",
    };

    // ── Return result ───────────────────────────────────────────────────
    return successResponse({
      quote,
      negotiation_pack: negotiationPack,
    });
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
