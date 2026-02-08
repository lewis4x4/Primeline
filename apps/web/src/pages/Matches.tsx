import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatRelativeDate } from "@/lib/formatters";

/* ─── Placeholder insights for demo ─── */

const INSIGHTS = [
  "High audience overlap in lifestyle + fitness demographics.",
  "Brand recently increased NIL spend 40% YoY. Strong timing signal.",
  "Athlete's engagement rate (6.2%) is 3× brand's campaign average.",
  "Geographic alignment: Brand expanding in athlete's home market.",
  "Content style match — brand favors authentic, behind-the-scenes format.",
  "Brand's competitor just signed a rival athlete. Counter-position opportunity.",
  "Audience skews 18-24 female — exact demo brand is targeting for Q3.",
  "Athlete's sport is trending on TikTok. Cultural moment alignment.",
  "Brand has open RFP for college athletes in this conference.",
  "Strong values alignment — both emphasize sustainability messaging.",
];

function getInsight(index: number): string {
  return INSIGHTS[index % INSIGHTS.length];
}

/* ─── Ghost Feed (Empty State) ─── */

function GhostFeed() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4 px-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="border border-dashed border-gray-300 overflow-hidden opacity-30"
        >
          <div className="px-6 py-4 border-b border-dashed border-gray-200 flex justify-between">
            <div className="w-24 h-4 bg-gray-200" />
            <div className="w-20 h-3 bg-gray-200" />
          </div>
          <div className="px-6 py-8 flex items-center justify-between">
            <div className="w-28 h-6 bg-gray-200" />
            <div className="w-4 h-4 bg-gray-200" />
            <div className="w-28 h-6 bg-gray-200" />
          </div>
          <div className="px-6 pb-6">
            <div className="w-full h-3 bg-gray-200 mb-2" />
            <div className="w-3/4 h-3 bg-gray-200" />
          </div>
          <div className="h-12 bg-gray-100" />
        </div>
      ))}
      <div className="text-center py-8">
        <p className="font-mono text-sm text-gray-400 uppercase tracking-widest">
          No signals detected yet
        </p>
        <p className="text-xs text-gray-300 mt-1 font-mono">
          Run the matching engine to surface opportunities
        </p>
      </div>
    </div>
  );
}

/* ─── Match Card ─── */

function MatchCard({ match, index }: { match: any; index: number }) {
  const score = Math.round(match.match_score || 0);
  const scoreColor =
    score >= 80
      ? "text-green-600"
      : score >= 60
        ? "text-black"
        : "text-gray-400";

  const breakdown = match.score_breakdown || {};
  const topReasons = Object.entries(breakdown)
    .filter(([, v]) => (v as number) > 0.5)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([k]) => k.replace(/_/g, " "));

  return (
    <div className="border border-black bg-white group hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
      {/* Header: Score + Timestamp */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
        <div className={`font-mono font-bold tracking-tight ${scoreColor}`}>
          [{score}% MATCH]
        </div>
        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
          Detected {formatRelativeDate(match.created_at)}
        </div>
      </div>

      {/* Body: Brand × Athlete */}
      <div className="px-6 py-8 flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tighter">
            {match.brands?.name || "—"}
          </p>
          <p className="text-[11px] font-mono text-gray-400 uppercase">
            {(match.brands?.category || []).join(" · ") || "Brand"}
          </p>
        </div>
        <div className="text-gray-300 font-mono text-2xl px-6">×</div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tighter">
            {match.athletes?.full_name || "—"}
          </p>
          <p className="text-[11px] font-mono text-gray-400 uppercase">
            {match.athletes?.sport || "Athlete"}{" "}
            {match.athletes?.school ? `· ${match.athletes.school}` : ""}
          </p>
        </div>
      </div>

      {/* Insight */}
      <div className="px-6 pb-6 border-b border-gray-200">
        <p className="text-gray-600 font-mono text-sm leading-relaxed">
          &gt; {getInsight(index)}
        </p>
        {topReasons.length > 0 && (
          <div className="flex gap-2 mt-3">
            {topReasons.map((r) => (
              <span
                key={r}
                className="text-[10px] font-mono uppercase tracking-wider border border-gray-200 px-2 py-0.5 text-gray-400"
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status + Action */}
      <div className="flex">
        {match.status !== "new" && (
          <div className="px-6 py-4 border-r border-gray-200 flex items-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
              {match.status}
            </span>
          </div>
        )}
        <button className="flex-1 py-4 bg-black text-white font-mono text-xs uppercase tracking-widest hover:bg-gray-900 transition-colors flex items-center justify-center gap-2">
          <span>Generate Pitch</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Main Matches Page ─── */

export default function Matches() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          athletes(full_name, sport, school),
          brands(name, category, budget_tier)
        `,
        )
        .order("match_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="-m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Signal Feed — Algorithmic Matches
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-gray-300">
          {matches?.length || 0} signals
        </span>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-64 w-full" />
          ))}
        </div>
      ) : !matches?.length ? (
        <GhostFeed />
      ) : (
        /* Signal Feed */
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {matches.map((m: any, i: number) => (
            <MatchCard key={m.id} match={m} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
