import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const FN = "[generate-daily-digest]";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (authHeader === `Bearer ${serviceKey}`) return true;
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

    if (!isAuthorized(req)) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    const supabase = getServiceClient();
    const now = new Date().toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const oneDayFromNow = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString();

    // ── 1. Top 10 matches by score (new/reviewed, not expired) ──────────
    const { data: topMatches } = await supabase
      .from("matches")
      .select(
        `
        id, match_score, status, score_breakdown, created_at,
        athletes:athlete_id ( id, full_name, sport ),
        brands:brand_id ( id, name, category )
      `,
      )
      .in("status", ["new", "reviewed"])
      .or(`expires_at.is.null,expires_at.gte.${now}`)
      .order("match_score", { ascending: false })
      .limit(10);

    // ── 2. Needs-contact queue: matches with no outreach attempts ───────
    const { data: needsContact } = await supabase
      .from("matches")
      .select(
        `
        id, match_score, created_at,
        athletes:athlete_id ( id, full_name ),
        brands:brand_id ( id, name )
      `,
      )
      .in("status", ["new", "reviewed"])
      .lt("created_at", oneDayAgo)
      .order("match_score", { ascending: false })
      .limit(20);

    // Filter to only those with no outreach attempts
    const needsContactIds = (needsContact || []).map(
      (m: { id: string }) => m.id,
    );

    let needsContactFiltered = needsContact || [];

    if (needsContactIds.length > 0) {
      const { data: hasOutreach } = await supabase
        .from("outreach_attempts")
        .select("match_id")
        .in("match_id", needsContactIds);

      const outreachedIds = new Set(
        (hasOutreach || []).map((o: { match_id: string }) => o.match_id),
      );

      needsContactFiltered = (needsContact || []).filter(
        (m: { id: string }) => !outreachedIds.has(m.id),
      );
    }

    // ── 3. Follow-ups due ───────────────────────────────────────────────
    const { data: followupsDue } = await supabase
      .from("outreach_attempts")
      .select(
        `
        id, match_id, next_followup_at, status, attempt_number,
        matches:match_id (
          athletes:athlete_id ( full_name ),
          brands:brand_id ( name )
        )
      `,
      )
      .lte("next_followup_at", oneDayFromNow)
      .not("status", "in", '("bounced","opted_out")')
      .not("next_followup_at", "is", null)
      .order("next_followup_at")
      .limit(20);

    // ── 4. Pipeline movers: deals updated in last 24h ───────────────────
    const { data: pipelineMovers } = await supabase
      .from("deals")
      .select(
        `
        id, status, deal_value, updated_at,
        athletes:athlete_id ( id, full_name ),
        brands:brand_id ( id, name )
      `,
      )
      .gte("updated_at", oneDayAgo)
      .order("updated_at", { ascending: false })
      .limit(20);

    // ── 5. Unreviewed deal intel from last 2 days ───────────────────────
    const { data: dealIntelReview } = await supabase
      .from("deal_intel")
      .select("id, brand_name, athlete_name, amount_low, amount_high, source_url, source_type, created_at")
      .eq("reviewed", false)
      .gte("created_at", twoDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    // ── Build digest content ────────────────────────────────────────────
    const digestContent = {
      top_matches: topMatches || [],
      needs_contact: needsContactFiltered,
      followups_due: followupsDue || [],
      pipeline_movers: pipelineMovers || [],
      deal_intel_review: dealIntelReview || [],
    };

    const sectionsSummary = {
      top_matches: (topMatches || []).length,
      needs_contact: needsContactFiltered.length,
      followups_due: (followupsDue || []).length,
      pipeline_movers: (pipelineMovers || []).length,
      deal_intel_review: (dealIntelReview || []).length,
    };

    // ── Insert digest record ────────────────────────────────────────────
    const { data: digest, error: digestErr } = await supabase
      .from("daily_digests")
      .insert({
        content: digestContent,
        sections_summary: sectionsSummary,
        dry_run: dryRun,
        generated_at: now,
      })
      .select("id")
      .single();

    if (digestErr) {
      console.error(`${FN} Digest insert error:`, digestErr.message);
      return errorResponse("Failed to store digest", 500);
    }

    // ── Optionally send to Slack ────────────────────────────────────────
    if (!dryRun && SLACK_WEBHOOK_URL) {
      try {
        const slackBlocks = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "PRIMELINE Daily Digest",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: [
                `*Top Matches:* ${sectionsSummary.top_matches}`,
                `*Needs Contact:* ${sectionsSummary.needs_contact}`,
                `*Follow-ups Due:* ${sectionsSummary.followups_due}`,
                `*Pipeline Movers:* ${sectionsSummary.pipeline_movers}`,
                `*Deal Intel to Review:* ${sectionsSummary.deal_intel_review}`,
              ].join("\n"),
            },
          },
        ];

        // Add top 3 matches as detail
        if (topMatches && topMatches.length > 0) {
          const matchLines = topMatches.slice(0, 3).map(
            (m: Record<string, unknown>) => {
              const athlete = m.athletes as Record<string, string> | null;
              const brand = m.brands as Record<string, string> | null;
              return `- ${athlete?.full_name || "Unknown"} x ${brand?.name || "Unknown"} (score: ${m.match_score})`;
            },
          );

          slackBlocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Top Match Highlights:*\n${matchLines.join("\n")}`,
            },
          });
        }

        await fetch(SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: slackBlocks }),
        });
      } catch (slackErr) {
        console.error(`${FN} Slack webhook error:`, slackErr);
        // Non-fatal
      }
    }

    // ── Return result ───────────────────────────────────────────────────
    return successResponse({
      digest_id: digest.id,
      sections_summary: sectionsSummary,
    });
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
