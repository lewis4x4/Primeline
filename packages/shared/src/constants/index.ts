export const FOLLOWER_TIERS = [
  { name: "nano", min: 0, max: 999, baseLow: 500, baseHigh: 2000 },
  { name: "micro", min: 1000, max: 4999, baseLow: 1500, baseHigh: 5000 },
  { name: "rising", min: 5000, max: 14999, baseLow: 4000, baseHigh: 12000 },
  { name: "mid", min: 15000, max: 49999, baseLow: 10000, baseHigh: 35000 },
  { name: "established", min: 50000, max: 149999, baseLow: 25000, baseHigh: 80000 },
  { name: "elite", min: 150000, max: Infinity, baseLow: 50000, baseHigh: 200000 },
] as const;

export const SPORT_MULTIPLIERS: Record<string, number> = {
  basketball: 1.3,
  football: 1.3,
  volleyball: 1.15,
  gymnastics: 1.2,
  soccer: 1.0,
  baseball: 1.0,
  tennis: 0.9,
  track: 0.9,
  softball: 0.85,
  swimming: 0.8,
  golf: 1.0,
  hockey: 0.9,
  lacrosse: 0.85,
  wrestling: 0.8,
  other: 0.75,
};

export const SKILL_MULTIPLIERS: Record<string, number> = {
  d1_starter: 1.3,
  d1_rotation: 1.1,
  d1_bench: 0.9,
  d2: 0.7,
  d3: 0.5,
  naia: 0.5,
  juco: 0.4,
};

export const ENGAGEMENT_THRESHOLDS = [
  { min: 6, multiplier: 1.4 },
  { min: 4, multiplier: 1.2 },
  { min: 2.5, multiplier: 1.0 },
  { min: 1, multiplier: 0.8 },
  { min: 0, multiplier: 0.6 },
] as const;

export const MULTI_PLATFORM_BONUS = 0.08;
export const COMBINED_MULTIPLIER_CAP = { min: 0.4, max: 2.0 };
