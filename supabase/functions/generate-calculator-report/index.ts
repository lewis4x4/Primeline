import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  computeValuation,
  computePerPostRates,
  getFollowerTier,
} from "../_shared/valuation-engine.ts";
import type {
  CalculatorInput,
  PlatformHandle,
  RateCard,
  Sport,
  SkillLevel,
} from "../_shared/types.ts";

const FN = "[generate-calculator-report]";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://primeline.ai";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

/**
 * Verify the caller is service-role or holds the cron secret.
 */
function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Service role bearer token
  if (authHeader === `Bearer ${serviceKey}`) return true;

  // Cron secret header
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET && cronHeader === CRON_SECRET) return true;

  return false;
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
    const { lead_id } = body;

    if (!lead_id) {
      return errorResponse("lead_id is required", 400);
    }

    // ── Fetch lead ──────────────────────────────────────────────────────
    const supabase = getServiceClient();

    const { data: lead, error: leadErr } = await supabase
      .from("calculator_leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) {
      return errorResponse("Lead not found", 404);
    }

    // ── Build calculator input from lead data ───────────────────────────
    const handles: PlatformHandle[] = [];

    if (lead.instagram_followers && lead.instagram_followers > 0) {
      handles.push({
        platform: "instagram",
        handle: lead.instagram_handle || "",
        followers: lead.instagram_followers,
        engagement_rate: lead.engagement_rate ?? undefined,
      });
    }

    if (lead.tiktok_followers && lead.tiktok_followers > 0) {
      handles.push({
        platform: "tiktok",
        handle: lead.tiktok_handle || "",
        followers: lead.tiktok_followers,
      });
    }

    if (lead.twitter_followers && lead.twitter_followers > 0) {
      handles.push({
        platform: "twitter",
        handle: "",
        followers: lead.twitter_followers,
      });
    }

    if (lead.youtube_subscribers && lead.youtube_subscribers > 0) {
      handles.push({
        platform: "youtube",
        handle: "",
        followers: lead.youtube_subscribers,
      });
    }

    const calcInput: CalculatorInput = {
      sport: (lead.sport || "other") as Sport,
      skill_level: (lead.skill_level || "d1_rotation") as SkillLevel,
      handles,
      engagement_rate: lead.engagement_rate ?? undefined,
    };

    // ── Run full valuation ──────────────────────────────────────────────
    const valuation = computeValuation(calcInput);

    // Optionally override per-post rates with DB rate cards
    const { data: rateCards } = await supabase
      .from("rate_cards")
      .select("content_type, platform, tier, rate_low, rate_high")
      .eq("sport", lead.sport || "other");

    if (rateCards && rateCards.length > 0) {
      const totalFollowers = handles.reduce((s, h) => s + h.followers, 0);
      const tier = getFollowerTier(totalFollowers);
      valuation.per_post_rates = computePerPostRates(
        handles,
        rateCards as RateCard[],
        tier.name,
      );
    }

    const perPostRates = valuation.per_post_rates;

    // ── Generate public slug ────────────────────────────────────────────
    const public_slug = crypto.randomUUID().slice(0, 8);

    // ── Store report ────────────────────────────────────────────────────
    const reportData = {
      lead_id,
      email: lead.email,
      full_name: lead.full_name,
      sport: lead.sport,
      skill_level: lead.skill_level,
      valuation,
      generated_at: new Date().toISOString(),
    };

    const { data: report, error: reportErr } = await supabase
      .from("calculator_reports")
      .insert({
        lead_id,
        public_slug,
        report_data: reportData,
      })
      .select("id")
      .single();

    if (reportErr) {
      console.error(`${FN} Report insert error:`, reportErr.message);
      return errorResponse("Failed to store report", 500);
    }

    // ── Send email via Resend ───────────────────────────────────────────
    let emailSent = false;

    if (RESEND_API_KEY && lead.email) {
      try {
        const reportUrl = `${PUBLIC_SITE_URL}/v/${public_slug}`;

        // Build per-post rate summary for email
        const topRates = perPostRates
          .slice(0, 5)
          .map(
            (r) =>
              `<tr>
                <td style="padding:8px 16px;border-bottom:1px solid #eee;font-size:14px;">${r.content_type.replace("_", " ")}</td>
                <td style="padding:8px 16px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">$${r.rate_low.toLocaleString()} - $${r.rate_high.toLocaleString()}</td>
              </tr>`,
          )
          .join("");

        const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <h1 style="font-size:20px;font-weight:600;margin-bottom:8px;">Your NIL Valuation Report</h1>
    <p style="font-size:14px;color:#555;margin-bottom:32px;">
      ${lead.full_name ? `Hi ${lead.full_name},` : "Hi,"} here is your estimated NIL value.
    </p>

    <div style="text-align:center;padding:32px 0;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:32px;">
      <p style="font-size:13px;color:#777;margin:0 0 4px;">Estimated Annual NIL Value</p>
      <p style="font-size:36px;font-weight:700;margin:0;">
        $${valuation.annual_low.toLocaleString()} &ndash; $${valuation.annual_high.toLocaleString()}
      </p>
      <p style="font-size:13px;color:#777;margin:8px 0 0;">
        ${valuation.follower_tier} tier &middot; ${valuation.percentile}th percentile
      </p>
    </div>

    <h2 style="font-size:16px;font-weight:600;margin-bottom:12px;">Per-Post Rate Estimates</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
      <thead>
        <tr>
          <th style="padding:8px 16px;text-align:left;font-size:12px;color:#777;border-bottom:2px solid #ddd;">Content Type</th>
          <th style="padding:8px 16px;text-align:right;font-size:12px;color:#777;border-bottom:2px solid #ddd;">Rate Range</th>
        </tr>
      </thead>
      <tbody>
        ${topRates}
      </tbody>
    </table>

    <div style="text-align:center;margin-bottom:32px;">
      <a href="${reportUrl}" style="display:inline-block;padding:12px 32px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        View Full Report
      </a>
    </div>

    <p style="font-size:12px;color:#999;line-height:1.5;">
      This valuation is an estimate based on publicly available data and market comparables.
      Actual deal values may vary. &copy; ${new Date().getFullYear()} Primeline Sports.
    </p>
  </div>
</body>
</html>`;

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "PRIMELINE <reports@primeline.ai>",
            to: [lead.email],
            subject: "Your NIL Valuation Report",
            html: htmlBody,
          }),
        });

        emailSent = resendRes.ok;

        if (!resendRes.ok) {
          const errText = await resendRes.text();
          console.error(`${FN} Resend API error:`, errText);
        }
      } catch (emailErr) {
        console.error(`${FN} Email send failed:`, emailErr);
      }
    }

    // ── Update lead with report sent timestamp ──────────────────────────
    if (emailSent) {
      await supabase
        .from("calculator_leads")
        .update({ full_report_sent_at: new Date().toISOString() })
        .eq("id", lead_id);
    }

    // ── Return result ───────────────────────────────────────────────────
    return successResponse({
      report_id: report.id,
      public_slug,
      email_sent: emailSent,
    });
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
