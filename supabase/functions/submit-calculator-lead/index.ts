import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { isValidEmail, sanitizeString } from "../_shared/validation.ts";

const FN = "[submit-calculator-lead]";

serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const body = await req.json();

    // ── Validate email ──────────────────────────────────────────────────
    const email = body.email?.trim()?.toLowerCase();

    if (!email || !isValidEmail(email)) {
      return errorResponse("A valid email address is required", 400);
    }

    // ── Sanitize all string inputs ──────────────────────────────────────
    const sanitized = {
      email,
      full_name: body.full_name ? sanitizeString(body.full_name, 200) : null,
      school: body.school ? sanitizeString(body.school, 200) : null,
      sport: body.sport ? sanitizeString(body.sport, 50) : null,
      skill_level: body.skill_level
        ? sanitizeString(body.skill_level, 50)
        : null,
      instagram_handle: body.instagram_handle
        ? sanitizeString(body.instagram_handle, 100)
        : null,
      instagram_followers: body.instagram_followers
        ? Number(body.instagram_followers)
        : null,
      tiktok_handle: body.tiktok_handle
        ? sanitizeString(body.tiktok_handle, 100)
        : null,
      tiktok_followers: body.tiktok_followers
        ? Number(body.tiktok_followers)
        : null,
      twitter_followers: body.twitter_followers
        ? Number(body.twitter_followers)
        : null,
      youtube_subscribers: body.youtube_subscribers
        ? Number(body.youtube_subscribers)
        : null,
      engagement_rate: body.engagement_rate
        ? Number(body.engagement_rate)
        : null,
      location_market: body.location_market
        ? sanitizeString(body.location_market, 100)
        : null,
      conference: body.conference
        ? sanitizeString(body.conference, 100)
        : null,
      utm_source: body.utm_source
        ? sanitizeString(body.utm_source, 200)
        : null,
      utm_medium: body.utm_medium
        ? sanitizeString(body.utm_medium, 200)
        : null,
      utm_campaign: body.utm_campaign
        ? sanitizeString(body.utm_campaign, 200)
        : null,
      full_report_requested: true,
    };

    // ── Upsert into calculator_leads ────────────────────────────────────
    const supabase = getServiceClient();

    const { data: lead, error } = await supabase
      .from("calculator_leads")
      .upsert(sanitized, {
        onConflict: "email",
        ignoreDuplicates: false,
      })
      .select("id, lead_score, qualified")
      .single();

    if (error) {
      console.error(`${FN} Upsert error:`, error.message);
      return errorResponse("Failed to save lead", 500);
    }

    // ── Return result ───────────────────────────────────────────────────
    // The DB trigger (auto-score) fires on insert/update, so
    // lead_score and qualified reflect the latest state.
    return successResponse({
      lead_id: lead.id,
      lead_score: lead.lead_score,
      qualified: lead.qualified,
    });
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
