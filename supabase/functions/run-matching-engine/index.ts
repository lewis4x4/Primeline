import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { MATCH_WEIGHTS } from "../_shared/types.ts";
import type { MatchScoreBreakdown } from "../_shared/types.ts";

const FN = "[run-matching-engine]";
const MIN_MATCH_THRESHOLD = 0.30;

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
// Sub-score computations (each returns 0-1)
// ─────────────────────────────────────────────────────────────────────────────

function computeCategoryScore(
  brandCategory: string | null,
  athleteSport: string | null,
  athleteTags: string[] | null,
): number {
  if (!brandCategory) return 0.3; // no brand category info, neutral-ish

  const bc = brandCategory.toLowerCase();
  const sport = (athleteSport || "").toLowerCase();
  const tags = (athleteTags || []).map((t: string) => t.toLowerCase());

  // Direct sport match
  if (bc.includes(sport) || sport.includes(bc)) return 1.0;

  // Sports-adjacent categories always have some affinity
  const sportsAdjacent = [
    "fitness",
    "athletic",
    "sports",
    "nutrition",
    "supplement",
    "apparel",
    "sneaker",
    "shoe",
    "energy",
    "hydration",
  ];
  if (sportsAdjacent.some((kw) => bc.includes(kw))) return 0.7;

  // Tag overlap
  if (tags.some((tag) => bc.includes(tag) || tag.includes(bc))) return 0.6;

  // Lifestyle/general categories have moderate affinity
  const lifestyleKw = [
    "lifestyle",
    "fashion",
    "beauty",
    "food",
    "beverage",
    "tech",
    "gaming",
    "entertainment",
  ];
  if (lifestyleKw.some((kw) => bc.includes(kw))) return 0.4;

  return 0.2;
}

function computePlatformScore(
  athletePlatforms: string[],
  brandSignalPlatforms: string[],
): number {
  if (!brandSignalPlatforms.length) return 0.5; // no data, neutral
  if (!athletePlatforms.length) return 0.2;

  const overlap = athletePlatforms.filter((p) =>
    brandSignalPlatforms.includes(p),
  ).length;
  return Math.min(1.0, overlap / brandSignalPlatforms.length);
}

function computeEngagementScore(
  engagementRate: number | null,
  followerTier: string | null,
): number {
  if (!engagementRate) return 0.5;

  // Tier average engagement rates (approximate)
  const tierAverages: Record<string, number> = {
    nano: 5.0,
    micro: 4.0,
    rising: 3.0,
    mid: 2.5,
    established: 2.0,
    elite: 1.5,
  };

  const avg = tierAverages[followerTier || "micro"] || 3.0;
  const ratio = engagementRate / avg;

  if (ratio >= 1.5) return 1.0;
  if (ratio >= 1.0) return 0.7;
  if (ratio >= 0.7) return 0.5;
  return 0.3;
}

function computeAvailabilityScore(
  hasExclusiveDeals: boolean,
  activeDealCount: number,
): number {
  if (hasExclusiveDeals) return 0.0;
  if (activeDealCount > 3) return 0.5;
  return 1.0;
}

function computeBudgetScore(
  brandBudgetTier: string | null,
  athleteValuationTier: string | null,
): number {
  if (!brandBudgetTier || !athleteValuationTier) return 0.5;

  const tierOrder = ["nano", "micro", "rising", "mid", "established", "elite"];
  const brandIdx = tierOrder.indexOf(brandBudgetTier.toLowerCase());
  const athleteIdx = tierOrder.indexOf(athleteValuationTier.toLowerCase());

  if (brandIdx === -1 || athleteIdx === -1) return 0.5;

  const diff = Math.abs(brandIdx - athleteIdx);
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.7;
  if (diff === 2) return 0.4;
  return 0.2;
}

function computeTotalScore(breakdown: MatchScoreBreakdown): number {
  return (
    breakdown.category * MATCH_WEIGHTS.category +
    breakdown.content * MATCH_WEIGHTS.content +
    breakdown.platform * MATCH_WEIGHTS.platform +
    breakdown.demo * MATCH_WEIGHTS.demo +
    breakdown.engagement * MATCH_WEIGHTS.engagement +
    breakdown.availability * MATCH_WEIGHTS.availability +
    breakdown.budget * MATCH_WEIGHTS.budget
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Protected match statuses that should NEVER be overwritten
// ─────────────────────────────────────────────────────────────────────────────

const PROTECTED_STATUSES = new Set([
  "approved",
  "pursuing",
  "converted",
  "declined",
]);

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

    const body = await req.json();
    const { athlete_id, brand_id, batch_size = 50 } = body;

    const supabase = getServiceClient();

    // ── Determine candidate brands ──────────────────────────────────────
    let candidateBrandIds: string[] = [];

    if (brand_id) {
      // Single brand mode
      candidateBrandIds = [brand_id];
    } else {
      // Batch mode: recent signals + watchlist
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [signalsRes, watchlistRes] = await Promise.all([
        supabase
          .from("brand_signals")
          .select("brand_id")
          .gte("detected_at", thirtyDaysAgo)
          .not("brand_id", "is", null)
          .limit(batch_size),
        supabase
          .from("brand_watchlist")
          .select("brand_id")
          .eq("active", true)
          .limit(batch_size),
      ]);

      const signalBrands = (signalsRes.data || []).map(
        (r: { brand_id: string }) => r.brand_id,
      );
      const watchlistBrands = (watchlistRes.data || []).map(
        (r: { brand_id: string }) => r.brand_id,
      );

      // Deduplicate
      candidateBrandIds = [...new Set([...signalBrands, ...watchlistBrands])];
    }

    if (candidateBrandIds.length === 0) {
      return successResponse({
        matches_upserted: 0,
        brands_processed: 0,
        athletes_evaluated: 0,
      });
    }

    // ── Fetch brands ────────────────────────────────────────────────────
    const { data: brands } = await supabase
      .from("brands")
      .select("id, name, category, status, budget_tier, signal_platforms")
      .in("id", candidateBrandIds);

    if (!brands || brands.length === 0) {
      return successResponse({
        matches_upserted: 0,
        brands_processed: 0,
        athletes_evaluated: 0,
      });
    }

    // ── Determine candidate athletes ────────────────────────────────────
    let athleteQuery = supabase
      .from("athletes")
      .select(
        "id, full_name, sport, status, tags, engagement_rate, follower_tier, valuation_tier",
      )
      .eq("status", "active");

    if (athlete_id) {
      athleteQuery = athleteQuery.eq("id", athlete_id);
    }

    const { data: athletes } = await athleteQuery.limit(500);

    if (!athletes || athletes.length === 0) {
      return successResponse({
        matches_upserted: 0,
        brands_processed: brands.length,
        athletes_evaluated: 0,
      });
    }

    // ── Fetch athlete social profiles for platform data ─────────────────
    const athleteIds = athletes.map((a: { id: string }) => a.id);

    const { data: socialProfiles } = await supabase
      .from("athlete_social_profiles")
      .select("athlete_id, platform")
      .in("athlete_id", athleteIds);

    const athletePlatformMap: Record<string, string[]> = {};
    for (const sp of socialProfiles || []) {
      if (!athletePlatformMap[sp.athlete_id]) {
        athletePlatformMap[sp.athlete_id] = [];
      }
      athletePlatformMap[sp.athlete_id].push(sp.platform);
    }

    // ── Fetch existing active deals to check exclusivity ────────────────
    const { data: activeDeals } = await supabase
      .from("deals")
      .select("athlete_id, brand_id, exclusivity, status")
      .in("athlete_id", athleteIds)
      .in("status", ["active", "pending"]);

    const athleteExclusiveDeals: Record<string, boolean> = {};
    const athleteDealCounts: Record<string, number> = {};
    const existingDealPairs = new Set<string>();

    for (const deal of activeDeals || []) {
      const key = `${deal.athlete_id}:${deal.brand_id}`;
      existingDealPairs.add(key);

      if (!athleteDealCounts[deal.athlete_id]) {
        athleteDealCounts[deal.athlete_id] = 0;
      }
      athleteDealCounts[deal.athlete_id]++;

      if (deal.exclusivity) {
        athleteExclusiveDeals[deal.athlete_id] = true;
      }
    }

    // ── Fetch existing matches with protected statuses ──────────────────
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("athlete_id, brand_id, status")
      .in("athlete_id", athleteIds)
      .in("brand_id", candidateBrandIds)
      .in("status", Array.from(PROTECTED_STATUSES));

    const protectedPairs = new Set<string>();
    for (const m of existingMatches || []) {
      protectedPairs.add(`${m.athlete_id}:${m.brand_id}`);
    }

    // ── Score all (brand, athlete) pairs ────────────────────────────────
    let matchesUpserted = 0;
    const matchesToUpsert: Array<Record<string, unknown>> = [];

    for (const brand of brands) {
      // Hard filter: blacklisted brand
      if (brand.status === "blacklisted") continue;

      const brandSignalPlatforms: string[] = brand.signal_platforms || [];

      for (const athlete of athletes) {
        // Hard filter: inactive athlete
        if (
          athlete.status === "paused" ||
          athlete.status === "archived"
        ) {
          continue;
        }

        // Hard filter: exclusivity conflict
        const pairKey = `${athlete.id}:${brand.id}`;
        if (existingDealPairs.has(pairKey)) continue;

        // Never overwrite protected matches
        if (protectedPairs.has(pairKey)) continue;

        // ── Compute sub-scores ──────────────────────────────────────
        const breakdown: MatchScoreBreakdown = {
          category: computeCategoryScore(
            brand.category,
            athlete.sport,
            athlete.tags,
          ),
          content: 0.5, // placeholder, needs ML later
          platform: computePlatformScore(
            athletePlatformMap[athlete.id] || [],
            brandSignalPlatforms,
          ),
          demo: 0.5, // placeholder, needs demographic data later
          engagement: computeEngagementScore(
            athlete.engagement_rate,
            athlete.follower_tier,
          ),
          availability: computeAvailabilityScore(
            !!athleteExclusiveDeals[athlete.id],
            athleteDealCounts[athlete.id] || 0,
          ),
          budget: computeBudgetScore(
            brand.budget_tier,
            athlete.valuation_tier,
          ),
        };

        const total = computeTotalScore(breakdown);

        // Only keep if above threshold
        if (total < MIN_MATCH_THRESHOLD) continue;

        const expiresAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();

        matchesToUpsert.push({
          athlete_id: athlete.id,
          brand_id: brand.id,
          match_score: Math.round(total * 100) / 100,
          score_breakdown: breakdown,
          status: "new",
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        });
      }
    }

    // ── Batch upsert matches ────────────────────────────────────────────
    if (matchesToUpsert.length > 0) {
      // Upsert in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < matchesToUpsert.length; i += chunkSize) {
        const chunk = matchesToUpsert.slice(i, i + chunkSize);

        const { error: upsertErr, count } = await supabase
          .from("matches")
          .upsert(chunk, {
            onConflict: "athlete_id,brand_id",
            ignoreDuplicates: false,
          });

        if (upsertErr) {
          console.error(
            `${FN} Match upsert error (chunk ${i}):`,
            upsertErr.message,
          );
        } else {
          matchesUpserted += chunk.length;
        }
      }
    }

    // ── Return summary ──────────────────────────────────────────────────
    return successResponse({
      matches_upserted: matchesUpserted,
      brands_processed: brands.length,
      athletes_evaluated: athletes.length,
    });
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
