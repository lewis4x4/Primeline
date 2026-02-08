import { VALID_SPORTS, VALID_SKILL_LEVELS } from "./types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Email
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Lightweight email validation -- regex check + max 254 characters (RFC 5321).
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_RE.test(email);
}

// ─────────────────────────────────────────────────────────────────────────────
// Required Fields
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify that every field in `fields` exists and is non-null/undefined on `body`.
 *
 * @returns An error message string listing the missing fields, or `null`
 *          if all fields are present.
 */
export function requireFields<T extends Record<string, unknown>>(
  body: T,
  fields: (keyof T)[],
): string | null {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null,
  );
  if (missing.length === 0) return null;
  return `Missing required fields: ${missing.join(", ")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Numeric helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clamp a number between `min` and `max` (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether `sport` is one of the spec-defined valid sports.
 */
export function isValidSport(sport: string): boolean {
  return VALID_SPORTS.has(sport);
}

/**
 * Check whether `level` is one of the spec-defined valid skill levels.
 */
export function isValidSkillLevel(level: string): boolean {
  return VALID_SKILL_LEVELS.has(level);
}

// ─────────────────────────────────────────────────────────────────────────────
// String sanitization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trim whitespace and optionally truncate a string to `maxLength` characters.
 * Defaults to 1000 characters if no max is specified.
 */
export function sanitizeString(s: string, maxLength = 1000): string {
  if (typeof s !== "string") return "";
  const trimmed = s.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}
