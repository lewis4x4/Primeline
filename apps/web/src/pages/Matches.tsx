import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { formatRelativeDate } from "@/lib/formatters";
import { Link } from "react-router-dom";

export default function Matches() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          athletes(full_name, sport, school),
          brands(name, category, budget_tier)
        `)
        .order("match_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Match Recommendations"
        description="Brand-athlete pairings scored by the matching engine"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      ) : !matches?.length ? (
        <EmptyState message="No matches generated yet. Run the matching engine to generate recommendations." />
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-right px-4 py-2 font-medium w-20">Score</th>
                <th className="text-left px-4 py-2 font-medium">Brand</th>
                <th className="text-left px-4 py-2 font-medium">Athlete</th>
                <th className="text-left px-4 py-2 font-medium">Top Reasons</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m: any) => {
                const breakdown = m.score_breakdown || {};
                const topReasons = Object.entries(breakdown)
                  .filter(([, v]) => (v as number) > 0.5)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 2)
                  .map(([k]) => k.replace(/_/g, " "));

                return (
                  <tr key={m.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-2 text-right">
                      <span className="data-cell text-base font-medium">
                        {m.match_score}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/brands/${m.brand_id}`} className="hover:underline font-medium">
                        {m.brands?.name || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/athletes/${m.athlete_id}`} className="hover:underline">
                        {m.athletes?.full_name || "—"}
                      </Link>
                      <span className="text-xs text-muted-foreground ml-1">
                        {m.athletes?.sport}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {topReasons.map((r) => (
                          <span key={r} className="text-xs border border-border rounded px-1.5 py-0.5 capitalize">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-sm">
                      {formatRelativeDate(m.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
