import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import VerificationBadge from "@/components/shared/VerificationBadge";
import MoneyDisplay from "@/components/shared/MoneyDisplay";
import { formatNumber, formatPercent } from "@/lib/formatters";

export default function AthleteDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: athlete, isLoading } = useQuery({
    queryKey: ["athletes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(`
          *,
          athlete_social_profiles(platform, handle, followers, engagement_rate),
          athlete_valuations(valuation, confidence, as_of, drivers, comp_count),
          matches(id, match_score, status, brands(name)),
          deals(id, deal_value, stage, brands(name))
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-48" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
      </div>
    );
  }

  if (!athlete) {
    return <p className="text-muted-foreground">Athlete not found.</p>;
  }

  const profiles = athlete.athlete_social_profiles || [];
  const valuations = athlete.athlete_valuations || [];
  const latestVal = valuations[0];
  const totalFollowers = profiles.reduce((s: number, p: any) => s + (p.followers || 0), 0);

  return (
    <div>
      <PageHeader
        title={athlete.full_name}
        description={`${athlete.school || ""} / ${athlete.sport || ""} / ${athlete.conference || ""}`}
        actions={<StatusBadge status={athlete.status} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="primeline-card">
          <p className="text-xs text-muted-foreground mb-1">Total Followers</p>
          <p className="value-display text-3xl">{formatNumber(totalFollowers)}</p>
        </div>
        <div className="primeline-card">
          <p className="text-xs text-muted-foreground mb-1">Composite Score</p>
          <p className="value-display text-3xl">{athlete.composite_score || "—"}</p>
        </div>
        <div className="primeline-card">
          <p className="text-xs text-muted-foreground mb-1">Active Deals</p>
          <p className="value-display text-3xl">
            {(athlete.deals || []).filter((d: any) => d.stage === "active").length}
          </p>
        </div>
      </div>

      {/* Social Profiles */}
      <h2 className="font-semibold text-sm mb-3">Social Profiles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {profiles.map((p: any) => (
          <div key={p.platform} className="primeline-card">
            <p className="text-xs text-muted-foreground capitalize">{p.platform}</p>
            <p className="font-mono text-sm">{p.handle}</p>
            <div className="flex justify-between mt-2">
              <span className="data-cell">{formatNumber(p.followers)}</span>
              <span className="data-cell">
                {p.engagement_rate ? formatPercent(p.engagement_rate) : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Valuation */}
      <h2 className="font-semibold text-sm mb-3">
        Current Valuation{" "}
        <VerificationBadge
          verified={latestVal?.comp_count >= 3 && latestVal?.confidence >= 70}
        />
      </h2>
      {latestVal ? (
        <div className="primeline-card mb-8">
          <MoneyDisplay
            low={latestVal.valuation?.annual?.low}
            high={latestVal.valuation?.annual?.high}
            size="lg"
          />
          <div className="mt-4 space-y-1">
            {(latestVal.drivers || []).map((d: any, i: number) => (
              <p
                key={i}
                className={`text-sm ${
                  d.type === "positive" ? "text-success" : "text-warning"
                }`}
              >
                {d.type === "positive" ? "\u2191" : "\u2193"} {d.text}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="primeline-card mb-8">
          <p className="text-sm text-muted-foreground">No valuation data yet.</p>
        </div>
      )}

      {/* Matches */}
      <h2 className="font-semibold text-sm mb-3">Recent Matches</h2>
      <div className="border border-border rounded overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-4 py-2 font-medium">Brand</th>
              <th className="text-right px-4 py-2 font-medium">Score</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(athlete.matches || []).length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-muted-foreground text-center">
                  No matches yet
                </td>
              </tr>
            ) : (
              (athlete.matches || []).slice(0, 10).map((m: any) => (
                <tr key={m.id} className="border-b border-border">
                  <td className="px-4 py-2">
                    <Link to={`/matches/${m.id}`} className="hover:underline">
                      {m.brands?.name || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right data-cell">{m.match_score}</td>
                  <td className="px-4 py-2"><StatusBadge status={m.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
