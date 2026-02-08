import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/formatters";
import { Link } from "react-router-dom";

/* ─── Stage Pill ─── */

function StagePill({ stage }: { stage: string }) {
  const label = stage?.replace(/_/g, " ") || "—";

  if (stage === "signed" || stage === "active" || stage === "completed") {
    return (
      <span className="bg-black text-white text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
        {label}
      </span>
    );
  }
  if (stage === "negotiating" || stage === "contract_sent") {
    return (
      <span className="border border-black text-black text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
        {label}
      </span>
    );
  }
  if (stage === "lost") {
    return (
      <span className="border border-gray-300 text-gray-400 text-[11px] px-2 py-0.5 rounded-none font-mono uppercase line-through">
        {label}
      </span>
    );
  }
  return (
    <span className="border border-gray-300 text-gray-500 text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
      {label}
    </span>
  );
}

/* ─── Ghost Ledger (Empty State) ─── */

function GhostLedger() {
  return (
    <div className="relative border border-dashed border-gray-300 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-8 px-6 py-2 border-b border-dashed border-gray-200 text-[10px] font-mono uppercase tracking-wider text-gray-300">
        <span>Deal ID</span>
        <span className="col-span-2">Parties</span>
        <span>Stage</span>
        <span className="text-right">Net to Talent</span>
        <span className="text-right">Commission</span>
        <span className="text-right">Gross</span>
        <span className="text-right">Updated</span>
      </div>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-14 border-b border-dashed border-gray-200 flex items-center px-6 opacity-25"
        >
          <div className="w-12 h-3 bg-gray-200 mr-6" />
          <div className="w-32 h-3 bg-gray-200 mr-6" />
          <div className="w-16 h-3 bg-gray-200 mr-auto" />
          <div className="w-16 h-3 bg-gray-200 mr-6" />
          <div className="w-14 h-3 bg-gray-200 mr-6" />
          <div className="w-14 h-3 bg-gray-200 mr-6" />
          <div className="w-12 h-3 bg-gray-200" />
        </div>
      ))}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
        <p className="font-mono text-sm text-gray-500 mb-2 uppercase tracking-widest">
          Ledger Empty
        </p>
        <p className="font-mono text-xs text-gray-300">
          Convert a match to start tracking revenue
        </p>
      </div>
    </div>
  );
}

/* ─── Main Deals Page ─── */

export default function Deals() {
  const { data: deals, isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(
          `
          *,
          athletes(full_name),
          brands(name)
        `,
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Compute ticker metrics
  const grossVolume =
    deals?.reduce((sum, d: any) => sum + (d.deal_value || 0), 0) || 0;
  const avgCommission = deals?.length
    ? deals.reduce((sum, d: any) => sum + (d.commission_rate || 0.15), 0) /
      deals.length
    : 0;
  const pendingValue =
    deals
      ?.filter(
        (d: any) =>
          d.stage !== "completed" &&
          d.stage !== "lost" &&
          d.stage !== "signed",
      )
      .reduce((sum, d: any) => sum + (d.deal_value || 0), 0) || 0;
  const closedCount =
    deals?.filter(
      (d: any) => d.stage === "signed" || d.stage === "completed",
    ).length || 0;

  return (
    <div className="-m-6">
      {/* Ticker Header — Sticky Black Bar */}
      <div className="bg-black text-white flex items-stretch border-b border-gray-800">
        <div className="flex-1 px-6 py-3 border-r border-gray-800">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            Gross Deal Vol
          </p>
          <p className="font-mono text-lg font-bold tabular-nums">
            {formatMoney(grossVolume)}
          </p>
        </div>
        <div className="flex-1 px-6 py-3 border-r border-gray-800">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            Avg Commission
          </p>
          <p className="font-mono text-lg font-bold tabular-nums">
            {(avgCommission * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex-1 px-6 py-3 border-r border-gray-800">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            Pending
          </p>
          <p className="font-mono text-lg font-bold tabular-nums">
            {formatMoney(pendingValue)}
          </p>
        </div>
        <div className="flex-1 px-6 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            Closed
          </p>
          <p className="font-mono text-lg font-bold tabular-nums">
            {closedCount}
          </p>
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Deal Ledger
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-gray-300">
          {deals?.length || 0} deals
        </span>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 border-b border-gray-100 flex items-center px-6"
            >
              <div className="w-12 h-3 skeleton mr-4" />
              <div className="w-32 h-3 skeleton" />
            </div>
          ))}
        </div>
      ) : !deals?.length ? (
        <GhostLedger />
      ) : (
        <div>
          {/* Table Header */}
          <div className="grid grid-cols-8 px-6 py-2 border-b border-gray-200 text-[10px] font-mono uppercase tracking-wider text-gray-400">
            <span>Deal ID</span>
            <span className="col-span-2">Parties</span>
            <span>Stage</span>
            <span className="text-right">Net to Talent</span>
            <span className="text-right">Commission</span>
            <span className="text-right">Gross Total</span>
            <span className="text-right">Updated</span>
          </div>

          {/* Table Rows */}
          {deals.map((deal: any) => {
            const gross = deal.deal_value || 0;
            const commRate = deal.commission_rate || 0.15;
            const commAmount = deal.commission_amount || gross * commRate;
            const netToTalent = gross - commAmount;
            const shortId = deal.id?.substring(0, 6).toUpperCase();

            return (
              <Link
                key={deal.id}
                to={`/deals/${deal.id}`}
                className="grid grid-cols-8 items-center px-6 py-3 border-b border-gray-100 hover:bg-black hover:text-white cursor-pointer transition-colors group"
              >
                {/* Deal ID */}
                <span className="font-mono text-[11px] text-gray-400 group-hover:text-gray-300">
                  #{shortId}
                </span>

                {/* Parties */}
                <div className="col-span-2 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {deal.brands?.name || "—"}
                  </span>
                  <span className="text-gray-400 group-hover:text-gray-300 mx-1.5 font-mono text-xs">
                    ×
                  </span>
                  <span className="text-sm text-gray-600 group-hover:text-gray-300 truncate">
                    {deal.athletes?.full_name || "—"}
                  </span>
                </div>

                {/* Stage */}
                <span>
                  <StagePill stage={deal.stage} />
                </span>

                {/* Net to Talent */}
                <span className="font-mono text-sm text-right tabular-nums">
                  {gross > 0 ? formatMoney(netToTalent) : "—"}
                </span>

                {/* Commission */}
                <span className="font-mono text-sm text-right tabular-nums text-gray-500 group-hover:text-gray-300">
                  {gross > 0 ? formatMoney(commAmount) : "—"}
                </span>

                {/* Gross Total */}
                <span className="font-mono text-sm text-right tabular-nums font-bold">
                  {gross > 0 ? formatMoney(gross) : "—"}
                </span>

                {/* Updated */}
                <span className="font-mono text-[11px] text-right text-gray-400 group-hover:text-gray-300">
                  {deal.updated_at
                    ? new Date(deal.updated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
