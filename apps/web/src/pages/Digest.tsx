import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/formatters";
import { Link } from "react-router-dom";

export default function Digest() {
  const { data: digest, isLoading } = useQuery({
    queryKey: ["daily-digest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_digests")
        .select("*")
        .order("digest_date", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const content = digest?.content || {};

  return (
    <div>
      <PageHeader
        title="Action Queue"
        description={digest ? `For ${formatDate(digest.digest_date)}` : "Today's tasks"}
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Matches */}
          <section>
            <h2 className="font-semibold text-sm mb-3">Top 10 Matches</h2>
            <div className="primeline-card">
              {(content.top_matches || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No new matches</p>
              ) : (
                <div className="space-y-2">
                  {(content.top_matches || []).map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                      <div>
                        <span className="font-medium text-sm">{m.brand_name}</span>
                        <span className="text-muted-foreground text-sm"> × {m.athlete_name}</span>
                      </div>
                      <span className="data-cell">{m.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Needs Contact */}
          <section>
            <h2 className="font-semibold text-sm mb-3">
              Needs Contact <span className="text-xs text-warning font-normal">24h SLA</span>
            </h2>
            <div className="primeline-card">
              {(content.needs_contact || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">All contacts up to date</p>
              ) : (
                <div className="space-y-2">
                  {(content.needs_contact || []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-sm">{item.brand_name}</span>
                      <button className="text-xs underline text-muted-foreground hover:text-foreground">
                        Add Contact
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Follow-ups Due */}
          <section>
            <h2 className="font-semibold text-sm mb-3">Follow-ups Due Today</h2>
            <div className="primeline-card">
              {(content.followups_due || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No follow-ups due</p>
              ) : (
                <div className="space-y-2">
                  {(content.followups_due || []).map((f: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-sm">{f.brand_name} re: {f.deal_name || "outreach"}</span>
                      <button className="text-xs underline text-muted-foreground hover:text-foreground">
                        Log Follow-up
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Deal Intel to Review */}
          <section>
            <h2 className="font-semibold text-sm mb-3">
              Deal Intel to Review <span className="text-xs text-warning font-normal">48h SLA</span>
            </h2>
            <div className="primeline-card">
              {(content.deal_intel_review || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Inbox clear</p>
              ) : (
                <div className="space-y-2">
                  {(content.deal_intel_review || []).map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-sm">{d.brand_name} - {d.athlete_name}</span>
                      <Link to="/deal-intel" className="text-xs underline text-muted-foreground hover:text-foreground">
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
