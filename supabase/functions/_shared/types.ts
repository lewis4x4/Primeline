// ─────────────────────────────────────────────────────────────────────────────
// Sport
// ─────────────────────────────────────────────────────────────────────────────

export type Sport =
  | "basketball"
  | "volleyball"
  | "gymnastics"
  | "soccer"
  | "track"
  | "softball"
  | "swimming"
  | "tennis"
  | "football"
  | "baseball"
  | "other";

export const VALID_SPORTS: ReadonlySet<string> = new Set<Sport>([
  "basketball",
  "volleyball",
  "gymnastics",
  "soccer",
  "track",
  "softball",
  "swimming",
  "tennis",
  "football",
  "baseball",
  "other",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Skill Level
// ─────────────────────────────────────────────────────────────────────────────

export type SkillLevel =
  | "d1_starter"
  | "d1_rotation"
  | "d1_bench"
  | "d2"
  | "d3"
  | "naia"
  | "juco";

export const VALID_SKILL_LEVELS: ReadonlySet<string> = new Set<SkillLevel>([
  "d1_starter",
  "d1_rotation",
  "d1_bench",
  "d2",
  "d3",
  "naia",
  "juco",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Follower Tiers
// ─────────────────────────────────────────────────────────────────────────────

export type FollowerTierName =
  | "nano"
  | "micro"
  | "rising"
  | "mid"
  | "established"
  | "elite";

export interface FollowerTier {
  name: FollowerTierName;
  min: number;
  max: number; // Infinity for the top tier
  baseLow: number;
  baseHigh: number;
}

export const FOLLOWER_TIERS: readonly FollowerTier[] = [
  { name: "nano", min: 0, max: 999, baseLow: 500, baseHigh: 2_000 },
  { name: "micro", min: 1_000, max: 4_999, baseLow: 1_500, baseHigh: 5_000 },
  { name: "rising", min: 5_000, max: 14_999, baseLow: 4_000, baseHigh: 12_000 },
  { name: "mid", min: 15_000, max: 49_999, baseLow: 10_000, baseHigh: 35_000 },
  {
    name: "established",
    min: 50_000,
    max: 149_999,
    baseLow: 25_000,
    baseHigh: 80_000,
  },
  {
    name: "elite",
    min: 150_000,
    max: Infinity,
    baseLow: 50_000,
    baseHigh: 200_000,
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Content Units
// ─────────────────────────────────────────────────────────────────────────────

export type ContentUnit =
  | "ig_post"
  | "ig_reel"
  | "ig_story"
  | "ig_carousel"
  | "tiktok_post"
  | "yt_short"
  | "yt_video"
  | "x_post"
  | "x_video"
  | "appearance"
  | "podcast"
  | "blog_post";

// ─────────────────────────────────────────────────────────────────────────────
// Platform Handles (Calculator Input)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformHandle {
  platform: string; // e.g. "instagram", "tiktok", "youtube", "x"
  handle: string;
  followers: number;
  engagement_rate?: number; // 0-100 percentage
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculator Input / Output
// ─────────────────────────────────────────────────────────────────────────────

export interface CalculatorInput {
  sport: Sport;
  skill_level: SkillLevel;
  handles: PlatformHandle[];
  engagement_rate?: number; // overall, 0-100
}

export interface PerPostRate {
  platform: string;
  content_type: ContentUnit;
  rate_low: number;
  rate_high: number;
}

export interface CalculatorOutput {
  annual_low: number;
  annual_high: number;
  follower_tier: FollowerTierName;
  per_post_rates: PerPostRate[];
  percentile: number; // 0-100
  drivers: Driver[];
}

export interface Driver {
  direction: "positive" | "negative" | "neutral";
  label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand Signal
// ─────────────────────────────────────────────────────────────────────────────

export type BrandSignalSource =
  | "social_tag"
  | "press"
  | "deal_tracker"
  | "user_report"
  | "scrape";

export interface BrandSignal {
  id?: string;
  athlete_id: string;
  brand_id: string;
  signal_source: BrandSignalSource;
  signal_date?: string;
  confidence: number; // 0-1
  raw_payload?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Match Score
// ─────────────────────────────────────────────────────────────────────────────

export const MATCH_WEIGHTS = {
  category: 0.25,
  content: 0.10,
  platform: 0.15,
  demo: 0.20,
  engagement: 0.10,
  availability: 0.10,
  budget: 0.10,
} as const;

export interface MatchScoreBreakdown {
  category: number;
  content: number;
  platform: number;
  demo: number;
  engagement: number;
  availability: number;
  budget: number;
}

export interface MatchScore {
  overall: number; // weighted sum 0-100
  breakdown: MatchScoreBreakdown;
  explanation: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Valuation Snapshot
// ─────────────────────────────────────────────────────────────────────────────

export interface ValuationSnapshot {
  id?: string;
  athlete_id: string;
  snapshot_date: string;
  annual_low: number;
  annual_high: number;
  follower_tier: FollowerTierName;
  per_post_rates: PerPostRate[];
  percentile: number;
  drivers: Driver[];
  input_hash?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Intel
// ─────────────────────────────────────────────────────────────────────────────

export type DealStatus =
  | "rumored"
  | "confirmed"
  | "active"
  | "completed"
  | "expired";

export interface DealIntel {
  id?: string;
  athlete_id: string;
  brand_id: string;
  deal_status: DealStatus;
  announced_value?: number;
  estimated_value_low?: number;
  estimated_value_high?: number;
  start_date?: string;
  end_date?: string;
  source_url?: string;
  confidence: number; // 0-1
}

// ─────────────────────────────────────────────────────────────────────────────
// Quote / Line Items
// ─────────────────────────────────────────────────────────────────────────────

export interface QuoteLineItem {
  content_type: ContentUnit;
  quantity: number;
  unit_rate: number;
  subtotal: number;
  platform: string;
  notes?: string;
}

export interface Quote {
  id?: string;
  athlete_id: string;
  brand_id?: string;
  line_items: QuoteLineItem[];
  total: number;
  currency: string; // default "USD"
  valid_until?: string;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Card (per-content-type pricing reference)
// ─────────────────────────────────────────────────────────────────────────────

export interface RateCard {
  content_type: ContentUnit;
  platform: string;
  tier: FollowerTierName;
  rate_low: number;
  rate_high: number;
}
