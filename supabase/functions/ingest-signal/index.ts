import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { resolveBrand } from "../_shared/brand-resolver.ts";

const FN = "[ingest-signal]";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (authHeader === `Bearer ${serviceKey}`) return true;
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET && cronHeader === CRON_SECRET) return true;
  return false;
}

/**
 * Compute SHA-256 hex fingerprint from a string.
 */
async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

    // ── Auth check ──────────────────────────────────────────────────────
    if (!isAuthorized(req)) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();

    const {
      signal_type,
      brand_name,
      brand_handle,
      brand_domain,
      source_url,
      raw_data,
      detected_at,
    } = body;

    // ── Validate required fields ────────────────────────────────────────
    if (!signal_type) {
      return errorResponse("signal_type is required", 400);
    }

    if (!brand_name) {
      return errorResponse("brand_name is required", 400);
    }

    // ── Compute signal fingerprint for dedup ────────────────────────────
    const detectedDate = detected_at
      ? new Date(detected_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const fingerprintInput = `${signal_type}${brand_name}${source_url || ""}${detectedDate}`;
    const signal_fingerprint = await sha256Hex(fingerprintInput);

    // ── Get service client ──────────────────────────────────────────────
    const supabase = getServiceClient();

    // ── Try insert -- handle unique constraint violation for dedup ───────
    // First check if fingerprint already exists
    const { data: existing } = await supabase
      .from("brand_signals")
      .select("id")
      .eq("signal_fingerprint", signal_fingerprint)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return successResponse({
        deduplicated: true,
        existing_signal_id: existing.id,
      });
    }

    // ── Resolve brand ───────────────────────────────────────────────────
    const resolved = await resolveBrand(
      supabase,
      brand_name,
      brand_domain,
      brand_handle,
    );

    // ── Insert signal ───────────────────────────────────────────────────
    const { data: signal, error: signalErr } = await supabase
      .from("brand_signals")
      .insert({
        signal_type,
        brand_id: resolved.brand_id,
        brand_name,
        brand_handle: brand_handle || null,
        brand_domain: brand_domain || null,
        source_url: source_url || null,
        raw_data: raw_data || null,
        detected_at: detected_at || new Date().toISOString(),
        signal_fingerprint,
      })
      .select("id")
      .single();

    if (signalErr) {
      // Could be a race condition on fingerprint uniqueness
      if (
        signalErr.code === "23505" ||
        signalErr.message?.includes("unique")
      ) {
        return successResponse({ deduplicated: true });
      }

      console.error(`${FN} Signal insert error:`, signalErr.message);
      return errorResponse("Failed to insert signal", 500);
    }

    // ── Increment brand signal count ────────────────────────────────────
    try {
      await supabase.rpc("increment_brand_signal_count", {
        p_brand_id: resolved.brand_id,
      });
    } catch (rpcErr) {
      console.error(`${FN} increment_brand_signal_count RPC error:`, rpcErr);
      // Non-fatal: signal was already inserted
    }

    // ── Return result ───────────────────────────────────────────────────
    return successResponse({
      signal_id: signal.id,
      brand_id: resolved.brand_id,
      is_new_brand: resolved.is_new,
    });
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
