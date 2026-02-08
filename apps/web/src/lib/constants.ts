export const SPORTS = [
  { value: "basketball", label: "Basketball" },
  { value: "football", label: "Football" },
  { value: "volleyball", label: "Volleyball" },
  { value: "soccer", label: "Soccer" },
  { value: "gymnastics", label: "Gymnastics" },
  { value: "track", label: "Track & Field" },
  { value: "softball", label: "Softball" },
  { value: "swimming", label: "Swimming" },
  { value: "tennis", label: "Tennis" },
  { value: "baseball", label: "Baseball" },
  { value: "lacrosse", label: "Lacrosse" },
  { value: "golf", label: "Golf" },
  { value: "hockey", label: "Hockey" },
  { value: "wrestling", label: "Wrestling" },
  { value: "other", label: "Other" },
] as const;

export const SKILL_LEVELS = [
  { value: "d1_starter", label: "D1 Starter" },
  { value: "d1_rotation", label: "D1 Rotation" },
  { value: "d1_bench", label: "D1 Bench" },
  { value: "d2", label: "D2" },
  { value: "d3", label: "D3" },
  { value: "naia", label: "NAIA" },
  { value: "juco", label: "JUCO" },
] as const;

export const CONFERENCES = [
  "SEC", "Big Ten", "Big 12", "ACC", "Pac-12", "AAC",
  "Mountain West", "Sun Belt", "MAC", "Conference USA",
  "Big East", "A-10", "WCC", "Ivy League", "Other",
] as const;

export const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "youtube", label: "YouTube" },
] as const;

export const DEAL_STAGES = [
  { value: "identified", label: "Identified" },
  { value: "outreach_sent", label: "Outreach Sent" },
  { value: "response_received", label: "Response Received" },
  { value: "negotiating", label: "Negotiating" },
  { value: "contract_sent", label: "Contract Sent" },
  { value: "signed", label: "Signed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "lost", label: "Lost" },
] as const;

export const BUDGET_TIERS = [
  { value: "micro", label: "Micro" },
  { value: "mid", label: "Mid" },
  { value: "major", label: "Major" },
] as const;

export const BRAND_STATUSES = [
  { value: "new", label: "New" },
  { value: "researching", label: "Researching" },
  { value: "contacted", label: "Contacted" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "blacklisted", label: "Blacklisted" },
] as const;
