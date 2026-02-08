import {
  type Sport,
  type SkillLevel,
  type FollowerTier,
  type FollowerTierName,
  type CalculatorInput,
  type CalculatorOutput,
  type PerPostRate,
  type Driver,
  type PlatformHandle,
  type RateCard,
  type ContentUnit,
  FOLLOWER_TIERS,
} from "./types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Sport Multipliers (from spec)
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_MULTIPLIERS: Record<string, number> = {
  basketball: 1.3,
  volleyball: 1.15,
  gymnastics: 1.2,
  soccer: 1.0,
  track: 0.9,
  softball: 0.85,
  swimming: 0.8,
  tennis: 0.9,
  football: 1.3,
  baseball: 1.0,
  other: 0.75,
};

// ─────────────────────────────────────────────────────────────────────────────
// Skill Level Multipliers (from spec)
// ─────────────────────────────────────────────────────────────────────────────

const SKILL_MULTIPLIERS: Record<string, number> = {
  d1_starter: 1.3,
  d1_rotation: 1.1,
  d1_bench: 0.9,
  d2: 0.7,
  d3: 0.5,
  naia: 0.5,
  juco: 0.4,
};

// ─────────────────────────────────────────────────────────────────────────────
// Engagement Rate Thresholds (from spec)
// ─────────────────────────────────────────────────────────────────────────────

interface EngagementBracket {
  minRate: number;
  multiplier: number;
}

const ENGAGEMENT_BRACKETS: EngagementBracket[] = [
  { minRate: 6.0, multiplier: 1.4 },
  { minRate: 4.0, multiplier: 1.2 },
  { minRate: 2.5, multiplier: 1.0 },
  { minRate: 1.0, multiplier: 0.8 },
];

const ENGAGEMENT_FLOOR_MULTIPLIER = 0.6;

// ─────────────────────────────────────────────────────────────────────────────
// Multi-platform bonus: 8% per additional active platform (>100 followers)
// ─────────────────────────────────────────────────────────────────────────────

const MULTI_PLATFORM_BONUS_RATE = 0.08;
const ACTIVE_PLATFORM_MIN_FOLLOWERS = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Combined multiplier cap
// ─────────────────────────────────────────────────────────────────────────────

const COMBINED_MULTIPLIER_MIN = 0.4;
const COMBINED_MULTIPLIER_MAX = 2.0;

// ─────────────────────────────────────────────────────────────────────────────
// Default Per-Post Rate Cards (by tier)
// Approximate mid-market rates for college athletes.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_RATE_CARDS: RateCard[] = [
  // --- nano ---
  { content_type: "ig_post", platform: "instagram", tier: "nano", rate_low: 25, rate_high: 75 },
  { content_type: "ig_reel", platform: "instagram", tier: "nano", rate_low: 50, rate_high: 150 },
  { content_type: "ig_story", platform: "instagram", tier: "nano", rate_low: 15, rate_high: 50 },
  { content_type: "ig_carousel", platform: "instagram", tier: "nano", rate_low: 30, rate_high: 100 },
  { content_type: "tiktok_post", platform: "tiktok", tier: "nano", rate_low: 50, rate_high: 150 },
  { content_type: "yt_short", platform: "youtube", tier: "nano", rate_low: 25, rate_high: 75 },
  { content_type: "yt_video", platform: "youtube", tier: "nano", rate_low: 100, rate_high: 300 },
  { content_type: "x_post", platform: "x", tier: "nano", rate_low: 15, rate_high: 50 },

  // --- micro ---
  { content_type: "ig_post", platform: "instagram", tier: "micro", rate_low: 75, rate_high: 200 },
  { content_type: "ig_reel", platform: "instagram", tier: "micro", rate_low: 100, rate_high: 350 },
  { content_type: "ig_story", platform: "instagram", tier: "micro", rate_low: 50, rate_high: 125 },
  { content_type: "ig_carousel", platform: "instagram", tier: "micro", rate_low: 100, rate_high: 275 },
  { content_type: "tiktok_post", platform: "tiktok", tier: "micro", rate_low: 100, rate_high: 400 },
  { content_type: "yt_short", platform: "youtube", tier: "micro", rate_low: 75, rate_high: 200 },
  { content_type: "yt_video", platform: "youtube", tier: "micro", rate_low: 250, rate_high: 750 },
  { content_type: "x_post", platform: "x", tier: "micro", rate_low: 50, rate_high: 125 },

  // --- rising ---
  { content_type: "ig_post", platform: "instagram", tier: "rising", rate_low: 200, rate_high: 500 },
  { content_type: "ig_reel", platform: "instagram", tier: "rising", rate_low: 300, rate_high: 800 },
  { content_type: "ig_story", platform: "instagram", tier: "rising", rate_low: 100, rate_high: 300 },
  { content_type: "ig_carousel", platform: "instagram", tier: "rising", rate_low: 250, rate_high: 650 },
  { content_type: "tiktok_post", platform: "tiktok", tier: "rising", rate_low: 300, rate_high: 900 },
  { content_type: "yt_short", platform: "youtube", tier: "rising", rate_low: 150, rate_high: 450 },
  { content_type: "yt_video", platform: "youtube", tier: "rising", rate_low: 500, rate_high: 1500 },
  { content_type: "x_post", platform: "x", tier: "rising", rate_low: 100, rate_high: 300 },

  // --- mid ---
  { content_type: "ig_post", platform: "instagram", tier: "mid", rate_low: 500, rate_high: 1250 },
  { content_type: "ig_reel", platform: "instagram", tier: "mid", rate_low: 750, rate_high: 2000 },
  { content_type: "ig_story", platform: "instagram", tier: "mid", rate_low: 250, rate_high: 700 },
  { content_type: "ig_carousel", platform: "instagram", tier: "mid", rate_low: 600, rate_high: 1500 },
  { content_type: "tiktok_post", platform: "tiktok", tier: "mid", rate_low: 750, rate_high: 2000 },
  { content_type: "yt_short", platform: "youtube", tier: "mid", rate_low: 400, rate_high: 1000 },
  { content_type: "yt_video", platform: "youtube", tier: "mid", rate_low: 1500, rate_high: 4000 },
  { content_type: "x_post", platform: "x", tier: "mid", rate_low: 250, rate_high: 650 },

  // --- established ---
  { content_type: "ig_post", platform: "instagram", tier: "established", rate_low: 1250, rate_high: 3500 },
  { content_type: "ig_reel", platform: "instagram", tier: "established", rate_low: 2000, rate_high: 5000 },
  { content_type: "ig_story", platform: "instagram", tier: "established", rate_low: 700, rate_high: 1800 },
  { content_type: "ig_carousel", platform: "instagram", tier: "established", rate_low: 1500, rate_high: 4000 },
  { content_type: "tiktok_post", platform: "tiktok", tier: "established", rate_low: 2000, rate_high: 5500 },
  { content_type: "yt_short", platform: "youtube", tier: "established", rate_low: 1000, rate_high: 2750 },
  { content_type: "yt_video", platform: "youtube", tier: "established", rate_low: 4000, rate_high: 10000 },
  { content_type: "x_post", platform: "x", tier: "established", rate_low: 650, rate_high: 1750 },

  // --- elite ---
  { content_type: "ig_post", platform: "instagram", tier: "elite", rate_low: 3500, rate_high: 10000 },
  { content_type: "ig_reel", platform: "instagram", tier: "elite", rate_low: 5000, rate_high: 15000 },
  { content_type: "ig_story", platform: "instagram", tier: "elite", rate_low: 1800, rate_high: 5000 },
  { content_type: "ig_carousel", platform: "instagram", tier: "elite", rate_low: 4000, rate_high: 12000 },
  { content_type: "tiktok_post", platform: "tiktok", tier: "elite", rate_low: 5500, rate_high: 15000 },
  { content_type: "yt_short", platform: "youtube", tier: "elite", rate_low: 2750, rate_high: 8000 },
  { content_type: "yt_video", platform: "youtube", tier: "elite", rate_low: 10000, rate_high: 30000 },
  { content_type: "x_post", platform: "x", tier: "elite", rate_low: 1750, rate_high: 5000 },
];

// ═════════════════════════════════════════════════════════════════════════════
// Public API
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Determine the follower tier for a given total follower count.
 */
export function getFollowerTier(totalFollowers: number): FollowerTier {
  for (let i = FOLLOWER_TIERS.length - 1; i >= 0; i--) {
    if (totalFollowers >= FOLLOWER_TIERS[i].min) {
      return FOLLOWER_TIERS[i];
    }
  }
  // Should never reach here, but fallback to nano
  return FOLLOWER_TIERS[0];
}

/**
 * Sport multiplier lookup. Returns 0.75 (other) for unknown sports.
 */
export function getSportMultiplier(sport: string): number {
  return SPORT_MULTIPLIERS[sport] ?? SPORT_MULTIPLIERS["other"];
}

/**
 * Engagement rate multiplier. `rate` is a percentage (e.g. 4.5 means 4.5%).
 */
export function getEngagementMultiplier(rate: number): number {
  for (const bracket of ENGAGEMENT_BRACKETS) {
    if (rate >= bracket.minRate) return bracket.multiplier;
  }
  return ENGAGEMENT_FLOOR_MULTIPLIER;
}

/**
 * Skill level multiplier. Falls back to 0.5 for unknown levels.
 */
export function getSkillMultiplier(level: string): number {
  return SKILL_MULTIPLIERS[level] ?? 0.5;
}

/**
 * Map athlete handles to per-post rate cards for their tier.
 *
 * If external `rateCards` are provided they take priority; otherwise the
 * built-in DEFAULT_RATE_CARDS are used.
 */
export function computePerPostRates(
  handles: PlatformHandle[],
  rateCards?: RateCard[],
  tierName?: FollowerTierName,
): PerPostRate[] {
  const cards = rateCards && rateCards.length > 0 ? rateCards : DEFAULT_RATE_CARDS;
  const tier = tierName ?? "nano";

  // Determine which platforms the athlete is active on
  const activePlatforms = new Set(
    handles
      .filter((h) => h.followers > 0)
      .map((h) => h.platform.toLowerCase()),
  );

  const rates: PerPostRate[] = [];

  for (const card of cards) {
    if (card.tier !== tier) continue;
    if (!activePlatforms.has(card.platform)) continue;

    rates.push({
      platform: card.platform,
      content_type: card.content_type,
      rate_low: card.rate_low,
      rate_high: card.rate_high,
    });
  }

  return rates;
}

/**
 * Estimate percentile rank within sport.
 *
 * Heuristic based on:
 * - follower tier position (higher tier = higher percentile baseline)
 * - engagement rate (better engagement pushes up)
 * - skill level (higher skill pushes up)
 *
 * Returns a value between 1 and 99.
 */
function estimatePercentile(
  tierIndex: number,
  engagementRate: number,
  skillLevel: string,
): number {
  // Base percentile from tier (0-5 mapped to 10-85)
  const tierBase = 10 + tierIndex * 15;

  // Engagement bonus: up to +10
  let engagementBonus = 0;
  if (engagementRate >= 6) engagementBonus = 10;
  else if (engagementRate >= 4) engagementBonus = 7;
  else if (engagementRate >= 2.5) engagementBonus = 4;
  else if (engagementRate >= 1) engagementBonus = 1;

  // Skill bonus: up to +8
  const skillBonusMap: Record<string, number> = {
    d1_starter: 8,
    d1_rotation: 6,
    d1_bench: 3,
    d2: 1,
    d3: 0,
    naia: 0,
    juco: -2,
  };
  const skillBonus = skillBonusMap[skillLevel] ?? 0;

  const raw = tierBase + engagementBonus + skillBonus;
  return Math.max(1, Math.min(99, Math.round(raw)));
}

/**
 * Build the human-readable drivers array explaining valuation factors.
 */
function buildDrivers(
  sport: Sport,
  sportMult: number,
  skillLevel: SkillLevel,
  skillMult: number,
  engagementRate: number,
  engagementMult: number,
  activePlatformCount: number,
  tierName: FollowerTierName,
  totalFollowers: number,
): Driver[] {
  const drivers: Driver[] = [];

  // Follower tier
  if (tierName === "elite" || tierName === "established") {
    drivers.push({
      direction: "positive",
      label: `${totalFollowers.toLocaleString()} total followers place you in the ${tierName} tier`,
    });
  } else if (tierName === "nano") {
    drivers.push({
      direction: "negative",
      label: `${totalFollowers.toLocaleString()} total followers place you in the nano tier -- growing your audience will significantly increase your value`,
    });
  } else {
    drivers.push({
      direction: "neutral",
      label: `${totalFollowers.toLocaleString()} total followers place you in the ${tierName} tier`,
    });
  }

  // Sport
  if (sportMult > 1.0) {
    drivers.push({
      direction: "positive",
      label: `${sport} is a high-demand sport for NIL deals (${sportMult}x multiplier)`,
    });
  } else if (sportMult < 1.0) {
    drivers.push({
      direction: "negative",
      label: `${sport} has lower NIL market demand (${sportMult}x multiplier)`,
    });
  } else {
    drivers.push({
      direction: "neutral",
      label: `${sport} has average NIL market demand`,
    });
  }

  // Skill level
  if (skillMult >= 1.1) {
    drivers.push({
      direction: "positive",
      label: `${skillLevel.replace(/_/g, " ")} skill level boosts your value (${skillMult}x)`,
    });
  } else if (skillMult <= 0.7) {
    drivers.push({
      direction: "negative",
      label: `${skillLevel.replace(/_/g, " ")} division level reduces your baseline (${skillMult}x)`,
    });
  }

  // Engagement
  if (engagementMult >= 1.2) {
    drivers.push({
      direction: "positive",
      label: `Strong engagement rate (${engagementRate.toFixed(1)}%) significantly increases your value`,
    });
  } else if (engagementMult <= 0.8) {
    drivers.push({
      direction: "negative",
      label: `Low engagement rate (${engagementRate.toFixed(1)}%) reduces your value -- focus on authentic content to improve`,
    });
  }

  // Multi-platform
  if (activePlatformCount > 1) {
    const bonusPct = (activePlatformCount - 1) * 8;
    drivers.push({
      direction: "positive",
      label: `Active on ${activePlatformCount} platforms (+${bonusPct}% multi-platform bonus)`,
    });
  } else {
    drivers.push({
      direction: "negative",
      label: "Only active on 1 platform -- expanding to additional platforms can increase your value by 8% each",
    });
  }

  return drivers;
}

// ═════════════════════════════════════════════════════════════════════════════
// Main valuation computation
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Compute the full NIL valuation for an athlete.
 *
 * Algorithm:
 *  1. Sum total followers across all platforms
 *  2. Determine follower tier
 *  3. Look up base annual range from tier
 *  4. Apply sport multiplier
 *  5. Apply engagement multiplier
 *  6. Apply skill level multiplier
 *  7. Apply multi-platform bonus (8% per additional platform with >100 followers)
 *  8. Cap combined multiplier at [0.4, 2.0]
 *  9. Calculate per-post rates
 * 10. Estimate percentile within sport
 * 11. Build drivers array
 * 12. Return CalculatorOutput
 */
export function computeValuation(input: CalculatorInput): CalculatorOutput {
  const { sport, skill_level, handles, engagement_rate } = input;

  // -- Step 1: Total followers -------------------------------------------
  const totalFollowers = handles.reduce((sum, h) => sum + (h.followers || 0), 0);

  // -- Step 2: Follower tier ---------------------------------------------
  const tier = getFollowerTier(totalFollowers);
  const tierIndex = FOLLOWER_TIERS.indexOf(tier);

  // -- Step 3: Base annual range -----------------------------------------
  const baseLow = tier.baseLow;
  const baseHigh = tier.baseHigh;

  // -- Step 4: Sport multiplier ------------------------------------------
  const sportMult = getSportMultiplier(sport);

  // -- Step 5: Engagement multiplier -------------------------------------
  // Use the provided overall engagement rate, or compute a weighted average
  // from per-handle rates, or default to 2.5% (neutral).
  let effectiveEngagement = engagement_rate ?? 0;
  if (!effectiveEngagement && handles.length > 0) {
    const handlesWithRate = handles.filter(
      (h) => h.engagement_rate !== undefined && h.engagement_rate > 0,
    );
    if (handlesWithRate.length > 0) {
      const totalWeightedRate = handlesWithRate.reduce(
        (sum, h) => sum + h.engagement_rate! * h.followers,
        0,
      );
      const totalWeightedFollowers = handlesWithRate.reduce(
        (sum, h) => sum + h.followers,
        0,
      );
      effectiveEngagement =
        totalWeightedFollowers > 0
          ? totalWeightedRate / totalWeightedFollowers
          : 2.5;
    } else {
      effectiveEngagement = 2.5; // default neutral
    }
  }
  const engagementMult = getEngagementMultiplier(effectiveEngagement);

  // -- Step 6: Skill level multiplier ------------------------------------
  const skillMult = getSkillMultiplier(skill_level);

  // -- Step 7: Multi-platform bonus --------------------------------------
  const activePlatforms = handles.filter(
    (h) => h.followers > ACTIVE_PLATFORM_MIN_FOLLOWERS,
  );
  const activePlatformCount = activePlatforms.length;
  const additionalPlatforms = Math.max(0, activePlatformCount - 1);
  const multiPlatformMult = 1 + additionalPlatforms * MULTI_PLATFORM_BONUS_RATE;

  // -- Step 8: Combined multiplier (capped) ------------------------------
  const rawCombined = sportMult * engagementMult * skillMult * multiPlatformMult;
  const combinedMult = Math.max(
    COMBINED_MULTIPLIER_MIN,
    Math.min(COMBINED_MULTIPLIER_MAX, rawCombined),
  );

  // Apply to base range
  const annualLow = Math.round(baseLow * combinedMult);
  const annualHigh = Math.round(baseHigh * combinedMult);

  // -- Step 9: Per-post rates --------------------------------------------
  const perPostRates = computePerPostRates(handles, undefined, tier.name);

  // -- Step 10: Percentile -----------------------------------------------
  const percentile = estimatePercentile(
    tierIndex,
    effectiveEngagement,
    skill_level,
  );

  // -- Step 11: Drivers --------------------------------------------------
  const drivers = buildDrivers(
    sport as Sport,
    sportMult,
    skill_level as SkillLevel,
    skillMult,
    effectiveEngagement,
    engagementMult,
    activePlatformCount,
    tier.name,
    totalFollowers,
  );

  // -- Step 12: Return ---------------------------------------------------
  return {
    annual_low: annualLow,
    annual_high: annualHigh,
    follower_tier: tier.name,
    per_post_rates: perPostRates,
    percentile,
    drivers,
  };
}
