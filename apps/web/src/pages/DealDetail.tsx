import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/formatters";
import { ArrowLeft } from "lucide-react";

/* ─── Inline Input ─── */

function InlineInput({
  value,
  onChange,
  width = "w-40",
  className = "",
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  width?: string;
  className?: string;
  [key: string]: any;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`inline-block border-b-2 border-black bg-yellow-50/50 text-center focus:outline-none focus:border-gray-400 px-1 py-0 ${width} ${className}`}
      {...props}
    />
  );
}

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
  return (
    <span className="border border-gray-300 text-gray-500 text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
      {label}
    </span>
  );
}

/* ─── Main Deal Detail ─── */

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(
          `
          *,
          athletes(full_name, sport, school),
          brands(name, domain),
          matches(match_score)
        `,
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Editable term sheet fields
  const [terms, setTerms] = useState<{
    deliverableCount: string;
    deliverableType: string;
    product: string;
    totalValue: string;
    deadline: string;
    usageRights: string;
    exclusivity: string;
  } | null>(null);

  // Initialize terms when deal loads
  if (deal && !terms) {
    const gross = deal.deal_value || 0;
    setTerms({
      deliverableCount: "3",
      deliverableType: deal.platform
        ? `${deal.platform.replace("_", " ")} posts`
        : "Instagram Reels",
      product: "product",
      totalValue: gross > 0 ? `$${gross.toLocaleString()}` : "$0",
      deadline: deal.closed_at
        ? new Date(deal.closed_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "TBD",
      usageRights: deal.usage_rights || "6 months, digital only",
      exclusivity: deal.exclusivity || "Non-exclusive",
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!terms) return;
      const valueNum = parseFloat(terms.totalValue.replace(/[^0-9.]/g, ""));
      const { error } = await supabase
        .from("deals")
        .update({
          deal_value: isNaN(valueNum) ? null : valueNum,
          usage_rights: terms.usageRights,
          exclusivity: terms.exclusivity,
          notes: `${terms.deliverableCount} ${terms.deliverableType} featuring ${terms.product}. Deadline: ${terms.deadline}.`,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full max-w-3xl mx-auto" />
      </div>
    );
  }

  if (!deal) {
    return (
      <p className="text-gray-400 font-mono text-sm">Deal not found.</p>
    );
  }

  const gross = deal.deal_value || 0;
  const commRate = deal.commission_rate || 0.15;
  const commAmount = deal.commission_amount || gross * commRate;
  const netToTalent = gross - commAmount;
  const shortId = deal.id?.substring(0, 6).toUpperCase();

  return (
    <div className="-m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link
            to="/deals"
            className="text-gray-400 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Deal #{shortId}
          </span>
          <StagePill stage={deal.stage} />
        </div>
      </div>

      {/* Financial Summary Bar */}
      <div className="grid grid-cols-4 border-b border-gray-200">
        <div className="px-6 py-3 border-r border-gray-200">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Gross Total
          </p>
          <p className="font-mono text-xl font-bold tabular-nums">
            {formatMoney(gross)}
          </p>
        </div>
        <div className="px-6 py-3 border-r border-gray-200">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Net to Talent
          </p>
          <p className="font-mono text-xl tabular-nums">
            {formatMoney(netToTalent)}
          </p>
        </div>
        <div className="px-6 py-3 border-r border-gray-200">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Agency Commission
          </p>
          <p className="font-mono text-xl tabular-nums">
            {formatMoney(commAmount)}{" "}
            <span className="text-xs text-gray-400">
              ({(commRate * 100).toFixed(0)}%)
            </span>
          </p>
        </div>
        <div className="px-6 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Match Score
          </p>
          <p className="font-mono text-xl tabular-nums">
            {deal.matches?.match_score
              ? `${Math.round(deal.matches.match_score)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Term Sheet */}
      {terms && (
        <div className="max-w-3xl mx-auto p-12 mt-8 mb-8 border border-gray-200 bg-white">
          {/* Document Header */}
          <div className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-8 border-b border-gray-100 pb-3 flex justify-between">
            <span>Deal Memorandum #{shortId}</span>
            <span>
              {new Date(deal.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Mad Libs Contract */}
          <div className="text-xl leading-[2.5] text-gray-900 font-serif">
            This agreement is entered into between{" "}
            <span className="font-bold">{deal.brands?.name || "—"}</span> and{" "}
            <span className="font-bold">
              {deal.athletes?.full_name || "—"}
            </span>
            . The Talent agrees to produce{" "}
            <InlineInput
              value={terms.deliverableCount}
              onChange={(v) => setTerms({ ...terms, deliverableCount: v })}
              width="w-12"
              className="font-mono font-bold"
            />{" "}
            <InlineInput
              value={terms.deliverableType}
              onChange={(v) => setTerms({ ...terms, deliverableType: v })}
              width="w-48"
            />{" "}
            featuring{" "}
            <InlineInput
              value={terms.product}
              onChange={(v) => setTerms({ ...terms, product: v })}
              width="w-52"
            />
            .
          </div>

          <div className="text-xl leading-[2.5] text-gray-900 font-serif mt-6">
            In exchange, the Brand agrees to pay a total of{" "}
            <InlineInput
              value={terms.totalValue}
              onChange={(v) => setTerms({ ...terms, totalValue: v })}
              width="w-36"
              className="font-mono font-bold"
            />{" "}
            upon completion of deliverables by{" "}
            <InlineInput
              value={terms.deadline}
              onChange={(v) => setTerms({ ...terms, deadline: v })}
              width="w-40"
            />
            .
          </div>

          <div className="text-xl leading-[2.5] text-gray-900 font-serif mt-6">
            Usage rights are granted for{" "}
            <InlineInput
              value={terms.usageRights}
              onChange={(v) => setTerms({ ...terms, usageRights: v })}
              width="w-56"
            />
            . This arrangement is{" "}
            <InlineInput
              value={terms.exclusivity}
              onChange={(v) => setTerms({ ...terms, exclusivity: v })}
              width="w-40"
            />
            .
          </div>

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-gray-200">
            <div>
              <div className="border-b border-black mb-2 h-10" />
              <p className="font-mono text-xs text-gray-400 uppercase">
                Brand Representative
              </p>
              <p className="text-sm mt-1">{deal.brands?.name || "—"}</p>
            </div>
            <div>
              <div className="border-b border-black mb-2 h-10" />
              <p className="font-mono text-xs text-gray-400 uppercase">
                Talent / Agency
              </p>
              <p className="text-sm mt-1">
                {deal.athletes?.full_name || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Performance Zone */}
      <div className="mx-6 mb-8">
        <div className="border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-2">
            Proof of Performance
          </p>
          <p className="text-sm text-gray-400">
            Drop screenshots, analytics, or deliverable links here to unlock
            payment
          </p>
          <div className="flex justify-center gap-3 mt-4">
            {["Deliverable 1", "Deliverable 2", "Deliverable 3"].map(
              (d, i) => (
                <div
                  key={i}
                  className="w-24 h-24 border border-dashed border-gray-300 flex items-center justify-center"
                >
                  <span className="font-mono text-[10px] text-gray-300 uppercase">
                    {d}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {deal.notes && (
        <div className="px-6 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-2">
            Notes
          </p>
          <p className="text-sm text-gray-600 font-mono">{deal.notes}</p>
        </div>
      )}

      {/* Floating Save Button */}
      {terms && (
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="fixed bottom-8 right-8 bg-black text-white rounded-none px-6 h-10 font-mono text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
        >
          {saveMutation.isPending ? "Saving..." : "Save Terms"}
        </button>
      )}
    </div>
  );
}
