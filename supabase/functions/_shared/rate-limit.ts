import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * IP-based rate limiting backed by the `rate_limits` table and the
 * `check_rate_limit` Postgres RPC.
 *
 * Fail-open: if the RPC errors we allow the request through so a
 * database hiccup does not take down the API.
 *
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_ip: ip,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      console.error("[rate-limit] RPC error, failing open:", error.message);
      return true; // fail-open
    }

    // The RPC returns true if allowed, false if rate-limited
    return data === true;
  } catch (err) {
    console.error("[rate-limit] Unexpected error, failing open:", err);
    return true; // fail-open
  }
}

/**
 * Extract the client IP address from the incoming request.
 *
 * Checks `x-forwarded-for` first (may contain a comma-separated list --
 * the leftmost entry is the original client), then falls back to
 * `x-real-ip`, then to `"unknown"`.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP in the chain (original client)
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
