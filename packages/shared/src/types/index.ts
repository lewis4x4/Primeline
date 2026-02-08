// Database-generated types will go here after `supabase gen types`
// For now, export domain types

export type Sport =
  | "basketball" | "football" | "volleyball" | "soccer"
  | "gymnastics" | "track" | "softball" | "swimming"
  | "tennis" | "baseball" | "lacrosse" | "golf"
  | "hockey" | "wrestling" | "other";

export type SkillLevel =
  | "d1_starter" | "d1_rotation" | "d1_bench"
  | "d2" | "d3" | "naia" | "juco";

export type Platform = "instagram" | "tiktok" | "twitter" | "youtube";

export type BudgetTier = "micro" | "mid" | "major";

export type DealStage =
  | "identified" | "outreach_sent" | "response_received"
  | "negotiating" | "contract_sent" | "signed"
  | "active" | "completed" | "lost";

export type MatchStatus =
  | "new" | "reviewed" | "approved" | "pursuing"
  | "converted" | "declined" | "expired";

export type FollowerTier =
  | "nano" | "micro" | "rising" | "mid" | "established" | "elite";

export type ContentUnit =
  | "ig_post" | "ig_reel" | "ig_story" | "ig_carousel"
  | "tiktok_post" | "yt_short" | "yt_video"
  | "twitter_post" | "twitter_thread"
  | "appearance" | "event" | "bundle" | "other";

export interface CalculatorInput {
  sport: string;
  skill_level: string;
  instagram_handle?: string;
  instagram_followers?: number;
  tiktok_handle?: string;
  tiktok_followers?: number;
  twitter_followers?: number;
  youtube_subscribers?: number;
  engagement_rate?: number;
  location_market?: string;
  conference?: string;
}

export interface PerPostRate {
  type: string;
  low: number;
  high: number;
}

export interface ValuationDriver {
  type: "positive" | "negative";
  text: string;
}

export interface CalculatorOutput {
  annual_low: number;
  annual_high: number;
  follower_tier: string;
  per_post: Record<string, { low: number; high: number }>;
  percentile: number;
  drivers: ValuationDriver[];
}
