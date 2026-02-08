import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatPercent } from "@/lib/formatters";

export default function Athletes() {
  const { data: athletes, isLoading } = useQuery({
    queryKey: ["athletes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(`
          *,
          athlete_social_profiles(platform, handle, followers, engagement_rate)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalFollowers = (profiles: Array<{ followers: number }>) =>
    profiles?.reduce((sum, p) => sum + (p.followers || 0), 0) || 0;

  const primaryEngagement = (profiles: Array<{ engagement_rate: number | null }>) => {
    const rates = profiles?.filter((p) => p.engagement_rate).map((p) => p.engagement_rate!) || [];
    return rates.length > 0 ? Math.max(...rates) : null;
  };

  return (
    <div>
      <PageHeader
        title="Athletes"
        description="Manage your athlete roster"
        actions={
          <Link
            to="/athletes/new"
            className="inline-flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 text-sm font-medium rounded hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add Athlete
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      ) : !athletes?.length ? (
        <EmptyState
          message="No athletes in your roster yet."
          actionLabel="Add Athlete"
          onAction={() => window.location.href = "/athletes/new"}
        />
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2 font-medium">Athlete</th>
                <th className="text-left px-4 py-2 font-medium">School / Sport</th>
                <th className="text-right px-4 py-2 font-medium">Followers</th>
                <th className="text-right px-4 py-2 font-medium">Engagement</th>
                <th className="text-right px-4 py-2 font-medium">Score</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((athlete: any) => (
                <tr key={athlete.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <Link
                      to={`/athletes/${athlete.id}`}
                      className="font-medium hover:underline"
                    >
                      {athlete.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {athlete.school} / {athlete.sport}
                  </td>
                  <td className="px-4 py-2 text-right data-cell">
                    {formatNumber(totalFollowers(athlete.athlete_social_profiles || []))}
                  </td>
                  <td className="px-4 py-2 text-right data-cell">
                    {primaryEngagement(athlete.athlete_social_profiles || [])
                      ? formatPercent(primaryEngagement(athlete.athlete_social_profiles || [])!)
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right data-cell">
                    {athlete.composite_score || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={athlete.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
