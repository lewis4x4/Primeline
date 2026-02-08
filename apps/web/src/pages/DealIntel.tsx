import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatDate, formatMoney } from "@/lib/formatters";
import { useState, useEffect, useCallback } from "react";

/* ─── Scanner Ghost State (Left Pane) ─── */

function IntelScanner() {
  return (
    <div className="flex-1 overflow-hidden relative">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-14 border-b border-gray-100 flex items-center px-4 opacity-40"
        >
          <div className="w-14 h-3 bg-gray-200 mr-4 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="w-3/4 h-3 bg-gray-200" />
            <div className="w-1/2 h-2 bg-gray-100" />
          </div>
        </div>
      ))}
      {/* Terminal Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80">
        <div className="font-mono text-sm text-gray-400">
          &gt; WAITING FOR HARVESTER...
          <span className="animate-blink">_</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Inspector Empty State (Right Pane) ─── */

function InspectorEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <img
        src="/primeline-logo.png"
        alt=""
        className="h-16 w-auto opacity-5 mb-6"
      />
      <p className="font-mono text-xs text-gray-300 uppercase tracking-widest">
        Select a signal to process
      </p>
    </div>
  );
}

/* ─── Main Deal Intel Page ─── */

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
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "approve" | "dismiss";
    }) => {
      const { error } = await supabase
        .from("deal_intel")
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          verification_level:
            action === "approve" ? "public_reported" : "rumor",
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
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
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
          if (selected)
            reviewMutation.mutate({ id: selected.id, action: "approve" });
          break;
        case "d":
          if (selected)
            reviewMutation.mutate({ id: selected.id, action: "dismiss" });
          break;
      }
    },
    [items, selected, reviewMutation],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-48px)]">
      {/* Terminal Header Bar */}
      <div className="h-12 bg-black text-white flex items-center justify-between px-6 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest">
            Intel Terminal
          </span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          {/* Filter Toggles */}
          <button
            onClick={() => setFilter("unreviewed")}
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 transition-colors ${
              filter === "unreviewed"
                ? "bg-white text-black"
                : "text-gray-500 hover:text-white"
            }`}
          >
            Unreviewed
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 transition-colors ${
              filter === "all"
                ? "bg-white text-black"
                : "text-gray-500 hover:text-white"
            }`}
          >
            All
          </button>
          <span className="font-mono text-[10px] text-gray-600 ml-2">
            J/K nav · A approve · D dismiss
          </span>
        </div>
      </div>

      {/* Split Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: Signal Feed */}
        <div className="w-2/5 border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Feed Header */}
          <div className="h-10 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Incoming Signals
            </span>
            <span className="font-mono text-[10px] text-gray-300">
              {items?.length || 0}
            </span>
          </div>

          {isLoading ? (
            <div className="flex-1 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 border-b border-gray-100 flex items-center px-4"
                >
                  <div className="w-14 h-3 skeleton mr-3" />
                  <div className="w-32 h-3 skeleton" />
                </div>
              ))}
            </div>
          ) : !items?.length ? (
            <IntelScanner />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {items.map((item: any, i: number) => {
                const isSelected = i === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedIndex(i)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                      isSelected
                        ? "bg-black text-white"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[9px] uppercase tracking-wider px-1 py-0.5 flex-shrink-0 ${
                              isSelected
                                ? "border border-white/30 text-gray-300"
                                : "border border-gray-200 text-gray-400"
                            }`}
                          >
                            {item.source_type || "web"}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {item.brand_name}
                          </span>
                        </div>
                        <p
                          className={`text-[11px] font-mono mt-1 truncate ${
                            isSelected ? "text-gray-300" : "text-gray-400"
                          }`}
                        >
                          {item.athlete_name || "Unknown"} ·{" "}
                          {item.deal_date ? formatDate(item.deal_date) : "—"}
                        </p>
                      </div>
                      {(item.amount_low || item.amount_high) && (
                        <span
                          className={`font-mono text-xs font-bold flex-shrink-0 tabular-nums ${
                            isSelected ? "text-white" : "text-black"
                          }`}
                        >
                          {item.amount_high
                            ? formatMoney(item.amount_high)
                            : item.amount_low
                              ? formatMoney(item.amount_low)
                              : ""}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Inspector */}
        <div className="w-3/5 flex flex-col overflow-hidden">
          {selected ? (
            <div className="flex-1 overflow-y-auto">
              {/* Inspector Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    {selected.brand_name}
                  </h3>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                    {selected.athlete_name || "Unknown athlete"} ·{" "}
                    {selected.source_type || "web"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      reviewMutation.mutate({
                        id: selected.id,
                        action: "approve",
                      })
                    }
                    className="bg-black text-white rounded-none px-4 h-8 font-mono text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors"
                  >
                    Approve (A)
                  </button>
                  <button
                    onClick={() =>
                      reviewMutation.mutate({
                        id: selected.id,
                        action: "dismiss",
                      })
                    }
                    className="border border-black text-black rounded-none px-4 h-8 font-mono text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                  >
                    Dismiss (D)
                  </button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-4 border-b border-gray-200">
                <div className="px-6 py-3 border-r border-gray-200">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                    Amount
                  </p>
                  <p className="font-mono text-sm font-bold tabular-nums mt-1">
                    {selected.amount_low && selected.amount_high
                      ? `${formatMoney(selected.amount_low)} – ${formatMoney(selected.amount_high)}`
                      : selected.amount_high
                        ? formatMoney(selected.amount_high)
                        : selected.amount_low
                          ? formatMoney(selected.amount_low)
                          : "—"}
                  </p>
                </div>
                <div className="px-6 py-3 border-r border-gray-200">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                    Platform
                  </p>
                  <p className="font-mono text-sm mt-1 uppercase">
                    {selected.platform || "—"}
                  </p>
                </div>
                <div className="px-6 py-3 border-r border-gray-200">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                    Verification
                  </p>
                  <p className="font-mono text-sm mt-1 uppercase">
                    {selected.verification_level?.replace(/_/g, " ") || "—"}
                  </p>
                </div>
                <div className="px-6 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                    Confidence
                  </p>
                  <p className="font-mono text-sm font-bold mt-1 tabular-nums">
                    {selected.extraction_confidence
                      ? `${selected.extraction_confidence}%`
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Source URL */}
              {selected.source_url && (
                <div className="px-6 py-3 border-b border-gray-200">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                    Source
                  </p>
                  <a
                    href={selected.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-gray-600 hover:text-black underline underline-offset-2 break-all"
                  >
                    {selected.source_url}
                  </a>
                </div>
              )}

              {/* Extracted Text */}
              {selected.extracted_text && (
                <div className="px-6 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-3">
                    Extracted Text
                  </p>
                  <div className="bg-gray-50 border border-gray-200 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
                    {selected.extracted_text}
                  </div>
                </div>
              )}

              {/* Extraction Summary */}
              <div className="px-6 py-4 border-t border-gray-200">
                <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-3">
                  Extracted Fields
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-mono text-[10px] text-gray-400 uppercase">
                      Brand
                    </p>
                    <p className="text-sm font-medium">
                      {selected.brand_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-gray-400 uppercase">
                      Athlete
                    </p>
                    <p className="text-sm font-medium">
                      {selected.athlete_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-gray-400 uppercase">
                      Deal Date
                    </p>
                    <p className="text-sm font-mono">
                      {selected.deal_date
                        ? formatDate(selected.deal_date)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-gray-400 uppercase">
                      Status
                    </p>
                    <p className="text-sm">
                      {selected.reviewed ? (
                        <span className="font-mono text-[11px] bg-black text-white px-2 py-0.5 uppercase">
                          Reviewed
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] border border-black px-2 py-0.5 uppercase">
                          Pending
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <InspectorEmpty />
          )}
        </div>
      </div>
    </div>
  );
}
