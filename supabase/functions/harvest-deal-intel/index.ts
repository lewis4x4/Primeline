import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsHeaders,
  successResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const FN = "[harvest-deal-intel]";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const GOOGLE_CUSTOM_SEARCH_KEY = Deno.env.get("GOOGLE_CUSTOM_SEARCH_KEY") ?? "";
const GOOGLE_SEARCH_ENGINE_ID = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID") ?? "";

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

// ─────────────────────────────────────────────────────────────────────────────
// Amount extraction regex patterns
// ─────────────────────────────────────────────────────────────────────────────

const DOLLAR_AMOUNT_RE =
  /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:million|mil|m\b)/gi;
const DOLLAR_K_RE = /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:thousand|k\b)/gi;
const DOLLAR_PLAIN_RE = /\$\s*([\d,]+(?:\.\d{1,2})?)/g;

function extractAmount(text: string): { low: number | null; high: number | null } {
  const amounts: number[] = [];

  // Try million amounts first
  let match: RegExpExecArray | null;
  const millionRe = new RegExp(DOLLAR_AMOUNT_RE.source, "gi");
  while ((match = millionRe.exec(text)) !== null) {
    const val = parseFloat(match[1].replace(/,/g, "")) * 1_000_000;
    if (val > 0 && val < 100_000_000) amounts.push(val);
  }

  // Try K amounts
  const kRe = new RegExp(DOLLAR_K_RE.source, "gi");
  while ((match = kRe.exec(text)) !== null) {
    const val = parseFloat(match[1].replace(/,/g, "")) * 1_000;
    if (val > 0 && val < 100_000_000) amounts.push(val);
  }

  // Try plain dollar amounts
  if (amounts.length === 0) {
    const plainRe = new RegExp(DOLLAR_PLAIN_RE.source, "g");
    while ((match = plainRe.exec(text)) !== null) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      if (val >= 100 && val < 100_000_000) amounts.push(val);
    }
  }

  if (amounts.length === 0) return { low: null, high: null };

  amounts.sort((a, b) => a - b);
  return {
    low: amounts[0],
    high: amounts.length > 1 ? amounts[amounts.length - 1] : amounts[0],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sport keyword extraction
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_KEYWORDS: Record<string, string[]> = {
  basketball: ["basketball", "hoops", "ncaa basketball"],
  football: ["football", "quarterback", "wide receiver", "ncaa football"],
  volleyball: ["volleyball"],
  gymnastics: ["gymnastics", "gymnast"],
  soccer: ["soccer"],
  softball: ["softball"],
  baseball: ["baseball"],
  swimming: ["swimming", "swimmer"],
  track: ["track", "track and field", "sprinter"],
  tennis: ["tennis"],
};

function extractSport(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [sport, keywords] of Object.entries(SPORT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return sport;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default search queries
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_QUERIES = [
  '"NIL deal" college athlete 2026',
  '"NIL partnership" announcement',
  "college athlete sponsorship deal",
  "NIL marketplace deal value",
];

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

    if (!GOOGLE_CUSTOM_SEARCH_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      return errorResponse(
        "Google Custom Search API credentials not configured",
        500,
      );
    }

    const body = await req.json().catch(() => ({}));
    const queries: string[] = body.queries && Array.isArray(body.queries)
      ? body.queries
      : DEFAULT_QUERIES;

    const supabase = getServiceClient();

    // ── Create scrape_run record ────────────────────────────────────────
    const { data: scrapeRun, error: scrapeRunErr } = await supabase
      .from("scrape_runs")
      .insert({
        status: "running",
        started_at: new Date().toISOString(),
        queries,
      })
      .select("id")
      .single();

    if (scrapeRunErr) {
      console.error(`${FN} Failed to create scrape_run:`, scrapeRunErr.message);
      return errorResponse("Failed to create scrape run", 500);
    }

    const scrapeRunId = scrapeRun.id;
    let totalResultsFound = 0;
    let totalNewDeals = 0;
    let totalDuplicatesSkipped = 0;
    const queryErrors: Array<{ query: string; error: string }> = [];

    // ── Process each query ──────────────────────────────────────────────
    for (const query of queries) {
      try {
        const searchUrl = new URL(
          "https://www.googleapis.com/customsearch/v1",
        );
        searchUrl.searchParams.set("key", GOOGLE_CUSTOM_SEARCH_KEY);
        searchUrl.searchParams.set("cx", GOOGLE_SEARCH_ENGINE_ID);
        searchUrl.searchParams.set("q", query);
        searchUrl.searchParams.set("num", "10");
        searchUrl.searchParams.set("dateRestrict", "d7");

        const searchRes = await fetch(searchUrl.toString());

        if (!searchRes.ok) {
          const errText = await searchRes.text();
          console.error(
            `${FN} Google Search API error for query "${query}":`,
            errText,
          );
          queryErrors.push({ query, error: `API returned ${searchRes.status}` });
          continue;
        }

        const searchData = await searchRes.json();
        const items = searchData.items || [];
        totalResultsFound += items.length;

        for (const item of items) {
          try {
            const sourceUrl: string = item.link || "";
            const title: string = item.title || "";
            const snippet: string = item.snippet || "";
            const combinedText = `${title} ${snippet}`;

            // Compute fingerprint from source URL
            const fingerprint = await sha256Hex(sourceUrl);

            // Check for duplicate
            const { data: existing } = await supabase
              .from("deal_intel")
              .select("id")
              .eq("source_url", sourceUrl)
              .limit(1)
              .maybeSingle();

            if (existing) {
              totalDuplicatesSkipped++;
              continue;
            }

            // Extract deal info from title + snippet
            const amounts = extractAmount(combinedText);
            const sport = extractSport(combinedText);

            // Extract brand name: first capitalized word sequence before common keywords
            let brandName: string | null = null;
            const brandMatch = combinedText.match(
              /(?:with|signs? with|partners? with|by)\s+([A-Z][A-Za-z\s&'.]+?)(?:\s+(?:for|in|on|to|NIL|deal|partnership|signs?)|\.|,|$)/,
            );
            if (brandMatch) {
              brandName = brandMatch[1].trim();
            }

            // Extract athlete name
            let athleteName: string | null = null;
            const athleteMatch = combinedText.match(
              /(?:athlete|star|player|(\b[A-Z][a-z]+\s[A-Z][a-z]+\b))(?:\s+(?:signs?|lands?|secures?|gets?))/,
            );
            if (athleteMatch) {
              athleteName = athleteMatch[1] || null;
            }

            // Compute extraction confidence
            let fieldsExtracted = 0;
            if (brandName) fieldsExtracted++;
            if (athleteName) fieldsExtracted++;
            if (amounts.low) fieldsExtracted++;
            if (sport) fieldsExtracted++;
            const extractionConfidence = Math.min(
              1.0,
              fieldsExtracted / 4,
            );

            // Insert into deal_intel
            const { error: insertErr } = await supabase
              .from("deal_intel")
              .insert({
                source_type: "news",
                source_url: sourceUrl,
                source_title: title,
                source_snippet: snippet,
                fingerprint,
                brand_name: brandName,
                athlete_name: athleteName,
                amount_low: amounts.low,
                amount_high: amounts.high,
                sport,
                extraction_confidence: extractionConfidence,
                reviewed: false,
                created_at: new Date().toISOString(),
              });

            if (insertErr) {
              // Could be a race condition on uniqueness
              if (
                insertErr.code === "23505" ||
                insertErr.message?.includes("unique")
              ) {
                totalDuplicatesSkipped++;
              } else {
                console.error(
                  `${FN} deal_intel insert error:`,
                  insertErr.message,
                );
              }
            } else {
              totalNewDeals++;
            }
          } catch (itemErr) {
            console.error(`${FN} Error processing search result:`, itemErr);
          }
        }
      } catch (queryErr) {
        const errMsg =
          queryErr instanceof Error ? queryErr.message : String(queryErr);
        console.error(`${FN} Error processing query "${query}":`, errMsg);
        queryErrors.push({ query, error: errMsg });
      }
    }

    // ── Update scrape_run ───────────────────────────────────────────────
    await supabase
      .from("scrape_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        records_found: totalResultsFound,
        records_ingested: totalNewDeals,
        errors: queryErrors.length > 0 ? queryErrors : null,
      })
      .eq("id", scrapeRunId);

    // ── Return result ───────────────────────────────────────────────────
    return successResponse({
      scrape_run_id: scrapeRunId,
      queries_run: queries.length,
      results_found: totalResultsFound,
      new_deals: totalNewDeals,
      duplicates_skipped: totalDuplicatesSkipped,
    });
  } catch (err) {
    console.error(`${FN} Unhandled error:`, err);
    return errorResponse("Internal server error", 500);
  }
});
