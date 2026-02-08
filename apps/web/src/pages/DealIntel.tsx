import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import MoneyDisplay from "@/components/shared/MoneyDisplay";
import { formatDate } from "@/lib/formatters";
import { useState, useEffect, useCallback } from "react";

export default function DealIntel() {
  const qc = useQueryClient();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState<"all" | "unreviewed">("unreviewed");

  const { data: items, isLoading } = useQuery({
    queryKey: ["deal-intel", filter],
    queryFn: async () => {
      let query = supabase
        .from("deal_intel")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter === "unreviewed") query = query.eq("reviewed", false);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "dismiss" }) => {
      const { error } = await supabase
        .from("deal_intel")
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          verification_level: action === "approve" ? "public_reported" : "rumor",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deal-intel"] }),
  });

  const selected = items?.[selectedIndex];

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!items?.length) return;
      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "a":
          if (selected) reviewMutation.mutate({ id: selected.id, action: "approve" });
          break;
        case "d":
          if (selected) reviewMutation.mutate({ id: selected.id, action: "dismiss" });
          break;
      }
    },
    [items, selected, reviewMutation]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div>
      <PageHeader
        title="Deal Intel Inbox"
        description="Review scraped deal intelligence. Keys: J/K navigate, A approve, D dismiss"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("unreviewed")}
              className={`px-3 py-1.5 text-sm rounded ${filter === "unreviewed" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Unreviewed
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm rounded ${filter === "all" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              All
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="skeleton h-96 w-full" />
      ) : (
        <div className="flex gap-4 h-[calc(100vh-200px)]">
          {/* Left panel: list */}
          <div className="w-1/2 border border-border rounded overflow-y-auto">
            {(items || []).map((item: any, i: number) => (
              <button
                key={item.id}
                onClick={() => setSelectedIndex(i)}
                className={`w-full text-left px-4 py-3 border-b border-border text-sm ${
                  i === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.brand_name}</p>
                    <p className="text-xs text-muted-foreground">{item.athlete_name || "Unknown athlete"}</p>
                  </div>
                  {(item.amount_low || item.amount_high) && (
                    <MoneyDisplay
                      low={item.amount_low}
                      high={item.amount_high}
                      size="sm"
                    />
                  )}
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-muted-foreground capitalize">{item.source_type}</span>
                  <span className="text-xs text-muted-foreground">{item.deal_date ? formatDate(item.deal_date) : ""}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right panel: detail */}
          <div className="w-1/2 border border-border rounded p-4 overflow-y-auto">
            {selected ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{selected.brand_name}</h3>
                    <p className="text-sm text-muted-foreground">{selected.athlete_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewMutation.mutate({ id: selected.id, action: "approve" })}
                      className="bg-foreground text-background px-3 py-1 text-xs font-medium rounded"
                    >
                      Approve (A)
                    </button>
                    <button
                      onClick={() => reviewMutation.mutate({ id: selected.id, action: "dismiss" })}
                      className="border border-destructive text-destructive px-3 py-1 text-xs font-medium rounded"
                    >
                      Dismiss (D)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <MoneyDisplay low={selected.amount_low} high={selected.amount_high} size="md" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Platform</p>
                    <p className="text-sm capitalize">{selected.platform || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Verification</p>
                    <p className="text-sm capitalize">{selected.verification_level?.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="data-cell">{selected.extraction_confidence || "—"}</p>
                  </div>
                </div>

                {selected.source_url && (
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-info hover:underline break-all">
                      {selected.source_url}
                    </a>
                  </div>
                )}

                {selected.extracted_text && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Extracted Text</p>
                    <p className="text-sm font-mono bg-muted p-3 rounded text-xs leading-relaxed whitespace-pre-wrap">
                      {selected.extracted_text}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select an item to review</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
