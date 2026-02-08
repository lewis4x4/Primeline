import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";
import { isValidSport, isValidSkillLevel } from "../_shared/validation.ts";
import {
  computeValuation,
  computePerPostRates,
  getFollowerTier,
} from "../_shared/valuation-engine.ts";
import type {
  CalculatorInput,
  PlatformHandle,
  Sport,
  SkillLevel,
} from "../_shared/types.ts";

const FN = "[calculate-public-nil-value]";

serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Parse body ──────────────────────────────────────────────────────
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const body = await req.json();

    const {
      sport,
      skill_level,
      instagram_handle,
      instagram_followers,
      tiktok_handle,
      tiktok_followers,
      twitter_followers,
      youtube_subscribers,
      engagement_rate,
      location_market,
      conference,
    } = body;

    // ── Validate required inputs ────────────────────────────────────────
    if (!sport || !isValidSport(sport)) {
      return errorResponse(
        "sport is required and must be a valid sport",
        400,
      );
    }

    if (!skill_level || !isValidSkillLevel(skill_level)) {
      return errorResponse(
        "skill_level is required and must be a valid skill level",
        400,
      );
    }

    // At least one follower count must be provided
    const hasFollowers =
      (instagram_followers && instagram_followers > 0) ||
      (tiktok_followers && tiktok_followers > 0) ||
      (twitter_followers && twitter_followers > 0) ||
      (youtube_subscribers && youtube_subscribers > 0);

    if (!hasFollowers) {
      return errorResponse(
        "At least one follower/subscriber count is required",
        400,
      );
    }

    // ── Rate limit check (10/hr by IP) ──────────────────────────────────
    const supabase = getServiceClient();
    const clientIp = getClientIp(req);

    const allowed = await checkRateLimit(
      supabase,
      clientIp,
      "calculate-public-nil-value",
      10,
      60,
    );

    if (!allowed) {
      return errorResponse(
        "Rate limit exceeded. Please try again later.",
        429,
      );
    }

    // ── Build platform handles ──────────────────────────────────────────
    const handles: PlatformHandle[] = [];

    if (instagram_followers && instagram_followers > 0) {
      handles.push({
        platform: "instagram",
        handle: instagram_handle || "",
        followers: Number(instagram_followers),
        engagement_rate: engagement_rate ? Number(engagement_rate) : undefined,
      });
    }

    if (tiktok_followers && tiktok_followers > 0) {
      handles.push({
        platform: "tiktok",
        handle: tiktok_handle || "",
        followers: Number(tiktok_followers),
      });
    }

    if (twitter_followers && twitter_followers > 0) {
      handles.push({
        platform: "twitter",
        handle: "",
        followers: Number(twitter_followers),
      });
    }

    if (youtube_subscribers && youtube_subscribers > 0) {
      handles.push({
        platform: "youtube",
        handle: "",
        followers: Number(youtube_subscribers),
      });
    }

    // ── Build calculator input ──────────────────────────────────────────
    const calcInput: CalculatorInput = {
      sport: sport as Sport,
      skill_level: skill_level as SkillLevel,
      handles,
      engagement_rate: engagement_rate ? Number(engagement_rate) : undefined,
    };

    // ── Query rate cards for per-post pricing ───────────────────────────
    const totalFollowers = handles.reduce((s, h) => s + h.followers, 0);
    const tier = getFollowerTier(totalFollowers);

    const { data: rateCards } = await supabase
      .from("rate_cards")
      .select("content_type, platform, tier, rate_low, rate_high")
      .eq("sport", sport)
      .order("content_type");

    // ── Compute valuation ───────────────────────────────────────────────
    const valuation = computeValuation(calcInput);

    // If DB rate cards exist, override the default per-post rates
    if (rateCards && rateCards.length > 0) {
      valuation.per_post_rates = computePerPostRates(
        handles,
        rateCards as import("../_shared/types.ts").RateCard[],
        tier.name,
      );
    }

    // ── Return full output ──────────────────────────────────────────────
    return successResponse(valuation);
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
