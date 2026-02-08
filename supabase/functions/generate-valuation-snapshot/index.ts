import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  computeValuation,
  computePerPostRates,
  getFollowerTier,
} from "../_shared/valuation-engine.ts";
import { clamp } from "../_shared/validation.ts";
import type {
  CalculatorInput,
  PlatformHandle,
  RateCard,
  PerPostRate,
  Sport,
  SkillLevel,
  FollowerTierName,
} from "../_shared/types.ts";

const FN = "[generate-valuation-snapshot]";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (authHeader === `Bearer ${serviceKey}`) return true;
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET && cronHeader === CRON_SECRET) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Package builder
// ─────────────────────────────────────────────────────────────────────────────

interface PackageSpec {
  name: string;
  deliverables: Array<{ content_type: string; quantity: number }>;
  usage_days: number;
  usage_type: string;
  exclusivity_days: number;
  exclusivity_scope: string;
}

const PACKAGE_SPECS: PackageSpec[] = [
  {
    name: "Starter",
    deliverables: [
      { content_type: "ig_reel", quantity: 1 },
      { content_type: "ig_story", quantity: 3 },
    ],
    usage_days: 30,
    usage_type: "organic",
    exclusivity_days: 0,
    exclusivity_scope: "none",
  },
  {
    name: "Growth",
    deliverables: [
      { content_type: "ig_reel", quantity: 2 },
      { content_type: "ig_story", quantity: 6 },
      { content_type: "tiktok_post", quantity: 1 },
    ],
    usage_days: 60,
    usage_type: "organic",
    exclusivity_days: 30,
    exclusivity_scope: "category",
  },
  {
    name: "Signature",
    deliverables: [
      { content_type: "ig_reel", quantity: 3 },
      { content_type: "ig_story", quantity: 9 },
      { content_type: "tiktok_post", quantity: 2 },
    ],
    usage_days: 90,
    usage_type: "paid whitelisting optional",
    exclusivity_days: 60,
    exclusivity_scope: "category",
  },
];

function buildPackages(
  perPostRates: PerPostRate[],
): Array<Record<string, unknown>> {
  const rateMap = new Map<string, { low: number; high: number }>();
  for (const r of perPostRates) {
    rateMap.set(r.content_type, { low: r.rate_low, high: r.rate_high });
  }

  return PACKAGE_SPECS.map((spec) => {
    let totalLow = 0;
    let totalHigh = 0;

    const items = spec.deliverables.map((d) => {
      const rate = rateMap.get(d.content_type) || { low: 50, high: 200 };
      const lineLow = rate.low * d.quantity;
      const lineHigh = rate.high * d.quantity;
      totalLow += lineLow;
      totalHigh += lineHigh;

      return {
        content_type: d.content_type,
        quantity: d.quantity,
        unit_rate_low: rate.low,
        unit_rate_high: rate.high,
        total_low: lineLow,
        total_high: lineHigh,
      };
    });

    return {
      name: spec.name,
      deliverables: items,
      total_low: totalLow,
      total_high: totalHigh,
      usage_days: spec.usage_days,
      usage_type: spec.usage_type,
      exclusivity_days: spec.exclusivity_days,
      exclusivity_scope: spec.exclusivity_scope,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence score computation
// ─────────────────────────────────────────────────────────────────────────────

function computeConfidence(
  sampleSize: number,
  avgVerification: number,
  medianCompAgeDays: number,
  fieldsPresent: number,
  totalFields: number,
): number {
  const sampleScore = 25 * Math.min(1, sampleSize / 10);
  const verificationScoreVal = 25 * Math.min(1, avgVerification / 0.8);
  const recencyScore = clamp(1 - medianCompAgeDays / 180, 0, 1);
  const completenessScore =
    totalFields > 0 ? fieldsPresent / totalFields : 0;

  return Math.round(
    sampleScore +
      verificationScoreVal +
      25 * recencyScore +
      25 * completenessScore,
  );
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

    if (!isAuthorized(req)) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json().catch(() => ({}));
    const { athlete_id, all } = body;

    if (!athlete_id && !all) {
      return errorResponse(
        "Either athlete_id or all=true is required",
        400,
      );
    }

    const supabase = getServiceClient();

    // ── Fetch athletes ──────────────────────────────────────────────────
    let athleteQuery = supabase
      .from("athletes")
      .select("id, full_name, sport, skill_level, engagement_rate, status");

    if (athlete_id) {
      athleteQuery = athleteQuery.eq("id", athlete_id);
    } else {
      athleteQuery = athleteQuery.eq("status", "active");
    }

    const { data: athletes, error: athleteErr } = await athleteQuery;

    if (athleteErr || !athletes || athletes.length === 0) {
      return errorResponse("No athletes found", 404);
    }

    let athletesProcessed = 0;
    let valuationsUpdated = 0;

    const today = new Date().toISOString().slice(0, 10);

    for (const athlete of athletes) {
      try {
        // ── Fetch social profiles ───────────────────────────────────
        const { data: socialProfiles } = await supabase
          .from("athlete_social_profiles")
          .select("platform, handle, followers, engagement_rate")
          .eq("athlete_id", athlete.id);

        const handles: PlatformHandle[] = (socialProfiles || []).map(
          (sp: Record<string, unknown>) => ({
            platform: sp.platform as string,
            handle: (sp.handle as string) || "",
            followers: (sp.followers as number) || 0,
            engagement_rate: (sp.engagement_rate as number) || undefined,
          }),
        );

        if (handles.length === 0) {
          console.error(
            `${FN} No social profiles for athlete ${athlete.id}, skipping`,
          );
          continue;
        }

        // ── Build calculator input ──────────────────────────────────
        const calcInput: CalculatorInput = {
          sport: (athlete.sport || "other") as Sport,
          skill_level: (athlete.skill_level || "d1_rotation") as SkillLevel,
          handles,
          engagement_rate: athlete.engagement_rate ?? undefined,
        };

        // ── Compute base valuation ──────────────────────────────────
        const valuation = computeValuation(calcInput);

        // ── Fetch DB rate cards for sport ────────────────────────────
        const { data: rateCards } = await supabase
          .from("rate_cards")
          .select("content_type, platform, tier, rate_low, rate_high")
          .eq("sport", athlete.sport || "other");

        // Override per-post rates if DB rate cards exist
        if (rateCards && rateCards.length > 0) {
          const totalFollowers = handles.reduce(
            (s, h) => s + h.followers,
            0,
          );
          const tier = getFollowerTier(totalFollowers);
          valuation.per_post_rates = computePerPostRates(
            handles,
            rateCards as RateCard[],
            tier.name,
          );
        }

        // ── Find comparable deals ───────────────────────────────────
        let comparables: Array<Record<string, unknown>> = [];
        let sampleSize = 0;
        let avgVerification = 0;
        let medianCompAgeDays = 90;

        try {
          const { data: comps } = await supabase.rpc(
            "find_comparable_deals",
            {
              p_athlete_id: athlete.id,
              p_limit: 10,
            },
          );

          if (comps && comps.length > 0) {
            comparables = comps;
            sampleSize = comps.length;
            avgVerification =
              comps.reduce(
                (s: number, c: Record<string, unknown>) =>
                  s + ((c.verification_score as number) || 0.5),
                0,
              ) / comps.length;

            // Compute median age in days
            const ages = comps
              .map((c: Record<string, unknown>) => {
                const created = c.created_at as string;
                if (!created) return 90;
                return Math.round(
                  (Date.now() - new Date(created).getTime()) /
                    (24 * 60 * 60 * 1000),
                );
              })
              .sort((a: number, b: number) => a - b);
            medianCompAgeDays = ages[Math.floor(ages.length / 2)];
          }
        } catch (compErr) {
          console.error(
            `${FN} find_comparable_deals RPC error for athlete ${athlete.id}:`,
            compErr,
          );
        }

        // ── Compute confidence ──────────────────────────────────────
        const totalFields = 6; // sport, skill_level, followers, engagement, handles, school
        let fieldsPresent = 0;
        if (athlete.sport) fieldsPresent++;
        if (athlete.skill_level) fieldsPresent++;
        if (handles.length > 0) fieldsPresent++;
        if (athlete.engagement_rate) fieldsPresent++;
        if (handles.some((h) => h.handle)) fieldsPresent++;
        fieldsPresent++; // athlete exists, so at least one field

        const confidence = computeConfidence(
          sampleSize,
          avgVerification,
          medianCompAgeDays,
          fieldsPresent,
          totalFields,
        );

        // ── Build packages ──────────────────────────────────────────
        const packages = buildPackages(valuation.per_post_rates);

        // ── Build per-post map by platform ──────────────────────────
        const perPostByPlatform: Record<string, Array<Record<string, unknown>>> = {};
        for (const rate of valuation.per_post_rates) {
          if (!perPostByPlatform[rate.platform]) {
            perPostByPlatform[rate.platform] = [];
          }
          perPostByPlatform[rate.platform].push({
            content_type: rate.content_type,
            rate_low: rate.rate_low,
            rate_high: rate.rate_high,
          });
        }

        // ── Build valuation JSONB ───────────────────────────────────
        const valuationData = {
          annual_low: valuation.annual_low,
          annual_high: valuation.annual_high,
          follower_tier: valuation.follower_tier,
          percentile: valuation.percentile,
          per_post: perPostByPlatform,
          packages,
          drivers: valuation.drivers,
          confidence,
          comparable_count: sampleSize,
        };

        // ── Upsert athlete_valuations ───────────────────────────────
        const { error: upsertErr } = await supabase
          .from("athlete_valuations")
          .upsert(
            {
              athlete_id: athlete.id,
              as_of: today,
              annual_low: valuation.annual_low,
              annual_high: valuation.annual_high,
              follower_tier: valuation.follower_tier,
              percentile: valuation.percentile,
              confidence,
              valuation_data: valuationData,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "athlete_id,as_of",
            },
          );

        if (upsertErr) {
          console.error(
            `${FN} Valuation upsert error for athlete ${athlete.id}:`,
            upsertErr.message,
          );
          continue;
        }

        // ── Update valuation_comps ──────────────────────────────────
        // Delete old comps for this athlete + date
        await supabase
          .from("valuation_comps")
          .delete()
          .eq("athlete_id", athlete.id)
          .eq("as_of", today);

        // Insert new comps
        if (comparables.length > 0) {
          const compRows = comparables.map(
            (c: Record<string, unknown>, idx: number) => ({
              athlete_id: athlete.id,
              as_of: today,
              comp_rank: idx + 1,
              deal_intel_id: c.id || null,
              brand_name: c.brand_name || null,
              amount_low: c.amount_low || null,
              amount_high: c.amount_high || null,
              sport: c.sport || null,
              verification_score: c.verification_score || null,
            }),
          );

          const { error: compErr } = await supabase
            .from("valuation_comps")
            .insert(compRows);

          if (compErr) {
            console.error(
              `${FN} valuation_comps insert error for athlete ${athlete.id}:`,
              compErr.message,
            );
          }
        }

        valuationsUpdated++;
        athletesProcessed++;
      } catch (athleteErr) {
        console.error(
          `${FN} Error processing athlete ${athlete.id}:`,
          athleteErr,
        );
        athletesProcessed++;
      }
    }

    // ── Return result ───────────────────────────────────────────────────
    return successResponse({
      athletes_processed: athletesProcessed,
      valuations_updated: valuationsUpdated,
    });
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
