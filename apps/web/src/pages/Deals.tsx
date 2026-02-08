import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import MoneyDisplay from "@/components/shared/MoneyDisplay";
import { formatRelativeDate } from "@/lib/formatters";
import { DEAL_STAGES } from "@/lib/constants";
import { useState } from "react";
import { Link } from "react-router-dom";

type ViewMode = "table" | "kanban";

export default function Deals() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const { data: deals, isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          athletes(full_name),
          brands(name)
        `)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Deal Pipeline"
        description="Track deals from identification to completion"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-sm rounded ${
                viewMode === "kanban" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-sm rounded ${
                viewMode === "table" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Table
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-64 w-64 flex-shrink-0" />
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = (deals || []).filter((d: any) => d.stage === stage.value);
            return (
              <div key={stage.value} className="w-64 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stage.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((deal: any) => (
                    <Link
                      key={deal.id}
                      to={`/deals/${deal.id}`}
                      className="primeline-card block hover:border-foreground transition-colors"
                    >
                      <p className="font-medium text-sm">{deal.brands?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{deal.athletes?.full_name || "—"}</p>
                      {deal.deal_value && (
                        <MoneyDisplay amount={deal.deal_value} size="sm" className="mt-1" />
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeDate(deal.updated_at)}
                      </p>
                    </Link>
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2 font-medium">Brand</th>
                <th className="text-left px-4 py-2 font-medium">Athlete</th>
                <th className="text-right px-4 py-2 font-medium">Value</th>
                <th className="text-left px-4 py-2 font-medium">Stage</th>
                <th className="text-left px-4 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(deals || []).map((deal: any) => (
                <tr key={deal.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <Link to={`/deals/${deal.id}`} className="hover:underline font-medium">
                      {deal.brands?.name || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{deal.athletes?.full_name || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {deal.deal_value ? <MoneyDisplay amount={deal.deal_value} size="sm" /> : "—"}
                  </td>
                  <td className="px-4 py-2"><StatusBadge status={deal.stage} /></td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatRelativeDate(deal.updated_at)}
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
