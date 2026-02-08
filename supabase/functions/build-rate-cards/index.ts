import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const FN = "[build-rate-cards]";

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
// Weighted percentile computation
// ─────────────────────────────────────────────────────────────────────────────

interface WeightedValue {
  value: number;
  weight: number;
}

function weightedPercentile(data: WeightedValue[], p: number): number {
  if (data.length === 0) return 0;
  if (data.length === 1) return data[0].value;

  // Sort by value ascending
  const sorted = [...data].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((s, d) => s + d.weight, 0);

  if (totalWeight === 0) return sorted[0].value;

  const target = (p / 100) * totalWeight;
  let cumWeight = 0;

  for (let i = 0; i < sorted.length; i++) {
    cumWeight += sorted[i].weight;
    if (cumWeight >= target) {
      return sorted[i].value;
    }
  }

  return sorted[sorted.length - 1].value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grouping key
// ─────────────────────────────────────────────────────────────────────────────

interface RateCardGroup {
  sport: string;
  platform: string;
  content_type: string;
  follower_tier: string;
  engagement_tier: string;
  values: WeightedValue[];
}

function groupKey(
  sport: string,
  platform: string,
  contentType: string,
  followerTier: string,
  engagementTier: string,
): string {
  return `${sport}|${platform}|${contentType}|${followerTier}|${engagementTier}`;
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
    const lookbackDays = body.lookback_days ?? 180;

    const supabase = getServiceClient();
    const cutoff = new Date(
      Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    // ── Pull deal_intel with amounts ────────────────────────────────────
    const { data: dealIntel } = await supabase
      .from("deal_intel")
      .select(
        "id, sport, platform, content_type, amount_low, amount_high, extraction_confidence, athlete_name, created_at",
      )
      .not("amount_low", "is", null)
      .gte("created_at", cutoff);

    // ── Pull internal deals with values ─────────────────────────────────
    const { data: internalDeals } = await supabase
      .from("deals")
      .select(
        `id, deal_value, sport, platform, content_type, created_at,
         athletes:athlete_id ( follower_tier, engagement_rate )`,
      )
      .not("deal_value", "is", null)
      .gte("created_at", cutoff);

    // ── Group all data ──────────────────────────────────────────────────
    const groups = new Map<string, RateCardGroup>();

    // Process deal_intel
    for (const di of dealIntel || []) {
      const sport = di.sport || "other";
      const platform = di.platform || "instagram";
      const contentType = di.content_type || "ig_post";
      const followerTier = "micro"; // default when unknown from deal_intel
      const engagementTier = "moderate";
      const verificationScore = di.extraction_confidence ?? 0.5;

      const avgAmount =
        di.amount_low && di.amount_high
          ? (di.amount_low + di.amount_high) / 2
          : di.amount_low || 0;

      if (avgAmount <= 0) continue;

      const key = groupKey(sport, platform, contentType, followerTier, engagementTier);

      if (!groups.has(key)) {
        groups.set(key, {
          sport,
          platform,
          content_type: contentType,
          follower_tier: followerTier,
          engagement_tier: engagementTier,
          values: [],
        });
      }

      groups.get(key)!.values.push({
        value: avgAmount,
        weight: verificationScore,
      });
    }

    // Process internal deals
    for (const deal of internalDeals || []) {
      const sport = deal.sport || "other";
      const platform = deal.platform || "instagram";
      const contentType = deal.content_type || "ig_post";

      const athlete = deal.athletes as Record<string, unknown> | null;
      const followerTier =
        (athlete?.follower_tier as string) || "micro";
      const engagementRate = (athlete?.engagement_rate as number) || 0;
      const engagementTier =
        engagementRate >= 4
          ? "high"
          : engagementRate >= 2
            ? "moderate"
            : "low";

      const dealValue = deal.deal_value || 0;
      if (dealValue <= 0) continue;

      const key = groupKey(sport, platform, contentType, followerTier, engagementTier);

      if (!groups.has(key)) {
        groups.set(key, {
          sport,
          platform,
          content_type: contentType,
          follower_tier: followerTier,
          engagement_tier: engagementTier,
          values: [],
        });
      }

      // Internal deals get higher verification weight (1.0)
      groups.get(key)!.values.push({
        value: dealValue,
        weight: 1.0,
      });
    }

    // ── Compute rate cards per group ────────────────────────────────────
    let rateCardsUpdated = 0;
    let rateCardsSkipped = 0;

    for (const [, group] of groups) {
      const sampleSize = group.values.length;

      // Skip groups with fewer than 3 data points
      if (sampleSize < 3) {
        rateCardsSkipped++;
        continue;
      }

      const rateLow = Math.round(weightedPercentile(group.values, 25));
      const rateMedian = Math.round(weightedPercentile(group.values, 50));
      const rateHigh = Math.round(weightedPercentile(group.values, 75));

      const { error: upsertErr } = await supabase
        .from("rate_cards")
        .upsert(
          {
            sport: group.sport,
            platform: group.platform,
            content_type: group.content_type,
            tier: group.follower_tier,
            engagement_tier: group.engagement_tier,
            rate_low: rateLow,
            rate_median: rateMedian,
            rate_high: rateHigh,
            sample_size: sampleSize,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict:
              "sport,platform,content_type,tier,engagement_tier",
          },
        );

      if (upsertErr) {
        console.error(`${FN} Rate card upsert error:`, upsertErr.message);
      } else {
        rateCardsUpdated++;
      }
    }

    // ── Return result ───────────────────────────────────────────────────
    return successResponse({
      groups_processed: groups.size,
      rate_cards_updated: rateCardsUpdated,
      rate_cards_skipped: rateCardsSkipped,
    });
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
