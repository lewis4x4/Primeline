import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X, Globe } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatNumber } from "@/lib/formatters";
import { BRAND_STATUSES, BUDGET_TIERS } from "@/lib/constants";

/* ─── Pipeline Stages ─── */

const PIPELINE_STAGES = [
  { key: "new", label: "Targeting" },
  { key: "researching", label: "Research" },
  { key: "contacted", label: "Outreach" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
] as const;

/* ─── Status Pill ─── */

function BrandStatusPill({ status }: { status: string }) {
  if (status === "active" || status === "contacted") {
    return (
      <span className="bg-black text-white text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
        {status}
      </span>
    );
  }
  if (status === "paused" || status === "blacklisted") {
    return (
      <span className="border border-gray-300 text-gray-400 text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
        {status}
      </span>
    );
  }
  return (
    <span className="border border-black text-black text-[11px] px-2 py-0.5 rounded-none font-mono uppercase">
      {status || "new"}
    </span>
  );
}

/* ─── Pipeline Stats Bar ─── */

function PipelineBar({ brands }: { brands: any[] }) {
  const counts = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: brands.filter((b) => b.status === stage.key).length,
  }));

  return (
    <div className="flex w-full border-b border-gray-200">
      {counts.map((stage, i) => (
        <div
          key={stage.key}
          className={`flex-1 py-3 text-center ${
            i < counts.length - 1 ? "border-r border-gray-200" : ""
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mr-2">
            {stage.label}
          </span>
          <span className="font-mono text-sm font-bold text-black">
            {stage.count}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Ghost Marketplace (Empty State) ─── */

function GhostMarketplace({ onScout }: { onScout: () => void }) {
  return (
    <div className="relative w-full border border-dashed border-gray-300 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-6 px-6 py-2 border-b border-dashed border-gray-200 text-[10px] font-mono uppercase tracking-wider text-gray-300">
        <span className="col-span-2">Brand</span>
        <span>Industry</span>
        <span>Budget</span>
        <span>Fit</span>
        <span className="text-right">Status</span>
      </div>
      {/* Ghost Rows */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-16 border-b border-dashed border-gray-200 flex items-center px-6 opacity-25"
        >
          <div className="w-10 h-10 rounded-full bg-gray-200 mr-4 flex-shrink-0" />
          <div className="w-24 h-3 bg-gray-200 mr-6" />
          <div className="w-16 h-3 bg-gray-200 mr-auto" />
          <div className="w-14 h-3 bg-gray-200 mr-6" />
          <div className="w-20 h-1.5 bg-gray-200 mr-6" />
          <div className="w-16 h-3 bg-gray-200" />
        </div>
      ))}

      {/* CTA Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
        <p className="font-mono text-sm text-gray-500 mb-4 uppercase tracking-widest">
          Pipeline Empty. Start Scouting.
        </p>
        <button
          onClick={onScout}
          className="bg-black text-white rounded-none px-8 h-12 font-mono text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
        >
          + Scout First Brand
        </button>
      </div>
    </div>
  );
}

/* ─── Brand Drawer (URL-First Entry) ─── */

function BrandDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    website: "",
    name: "",
    domain: "",
    category: "",
    budget_tier: "",
    notes: "",
  });
  const [enriched, setEnriched] = useState(false);

  function simulateEnrich() {
    if (!form.website.trim()) return;
    try {
      const url = form.website.startsWith("http")
        ? form.website
        : `https://${form.website}`;
      const hostname = new URL(url).hostname.replace("www.", "");
      const brandName = hostname
        .split(".")[0]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      setForm((f) => ({
        ...f,
        name: f.name || brandName,
        domain: hostname,
      }));
      setEnriched(true);
      setTimeout(() => setEnriched(false), 1500);
    } catch {
      // invalid URL, ignore
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brands").insert({
        name: form.name,
        website: form.website || null,
        domain: form.domain || null,
        category: form.category
          ? form.category.split(",").map((c) => c.trim())
          : [],
        budget_tier: form.budget_tier || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      setForm({
        website: "",
        name: "",
        domain: "",
        category: "",
        budget_tier: "",
        notes: "",
      });
      onClose();
    },
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/10 transition-opacity ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white border-l-2 border-black overflow-y-auto transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Scout Brand
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="px-6 py-6 space-y-5"
        >
          {/* URL-First Input */}
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
              Brand Website
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center flex-1 border-b border-gray-300 focus-within:border-black">
                <Globe className="h-3.5 w-3.5 text-gray-300 mr-2 flex-shrink-0" />
                <input
                  value={form.website}
                  onChange={(e) =>
                    setForm({ ...form, website: e.target.value })
                  }
                  onBlur={simulateEnrich}
                  placeholder="nike.com"
                  className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={simulateEnrich}
                className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-all ${
                  enriched
                    ? "bg-black text-white border-black"
                    : "border-gray-300 text-gray-400 hover:border-black hover:text-black"
                }`}
              >
                {enriched ? "Found" : "Enrich"}
              </button>
            </div>
          </div>

          {/* Name + Domain (auto-filled) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="group relative pt-4">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="peer w-full border-b border-gray-300 bg-transparent py-2 text-sm text-black placeholder-transparent focus:border-black focus:outline-none"
                placeholder="Brand Name"
              />
              <label className="absolute left-0 top-1 text-[10px] font-mono text-gray-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-focus:top-1 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-black">
                Brand Name
              </label>
            </div>
            <div className="group relative pt-4">
              <input
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                className="peer w-full border-b border-gray-300 bg-transparent py-2 text-sm text-black placeholder-transparent focus:border-black focus:outline-none font-mono"
                placeholder="Domain"
              />
              <label className="absolute left-0 top-1 text-[10px] font-mono text-gray-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-focus:top-1 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-black">
                Domain
              </label>
            </div>
          </div>

          {/* Category + Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div className="group relative pt-4">
              <input
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="peer w-full border-b border-gray-300 bg-transparent py-2 text-sm text-black placeholder-transparent focus:border-black focus:outline-none"
                placeholder="Category"
              />
              <label className="absolute left-0 top-1 text-[10px] font-mono text-gray-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-focus:top-1 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-black">
                Category
              </label>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                Budget Tier
              </label>
              <select
                value={form.budget_tier}
                onChange={(e) =>
                  setForm({ ...form, budget_tier: e.target.value })
                }
                className="w-full border-b border-gray-300 bg-transparent py-2 text-sm focus:border-black focus:outline-none appearance-none"
              >
                <option value="">—</option>
                {BUDGET_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border-b border-gray-300 bg-transparent py-2 text-sm focus:border-black focus:outline-none resize-none"
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-500 font-mono">
              {(mutation.error as Error).message}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-black text-white rounded-none px-6 h-10 font-mono text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Add to Pipeline"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs text-gray-400 hover:text-black uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ─── Main Brands Page ─── */

export default function Brands() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("");

  const { data: allBrands } = useQuery({
    queryKey: ["brands", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .is("deleted_at", null)
        .order("signal_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: brands, isLoading } = useQuery({
    queryKey: ["brands", statusFilter, budgetFilter],
    queryFn: async () => {
      let query = supabase
        .from("brands")
        .select("*")
        .is("deleted_at", null)
        .order("signal_count", { ascending: false });

      if (statusFilter) query = query.eq("status", statusFilter);
      if (budgetFilter) query = query.eq("budget_tier", budgetFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="-m-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Brand Pipeline
          </span>
          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-b border-gray-300 bg-transparent text-xs font-mono focus:border-black focus:outline-none appearance-none px-1 py-1"
            >
              <option value="">All Status</option>
              {BRAND_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={budgetFilter}
              onChange={(e) => setBudgetFilter(e.target.value)}
              className="border-b border-gray-300 bg-transparent text-xs font-mono focus:border-black focus:outline-none appearance-none px-1 py-1"
            >
              <option value="">All Budget</option>
              {BUDGET_TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 bg-black text-white rounded-none px-4 h-8 font-mono text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-3 w-3" /> Scout
        </button>
      </div>

      {/* Pipeline Stats Bar */}
      {allBrands && allBrands.length > 0 && (
        <PipelineBar brands={allBrands} />
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 border-b border-gray-100 flex items-center px-6"
            >
              <div className="w-10 h-10 rounded-full skeleton mr-4" />
              <div className="w-28 h-3 skeleton" />
            </div>
          ))}
        </div>
      ) : !brands?.length ? (
        /* Ghost Marketplace */
        <GhostMarketplace onScout={() => setDrawerOpen(true)} />
      ) : (
        /* Dense Marketplace Grid */
        <div>
          {/* Table Header */}
          <div className="grid grid-cols-12 px-6 py-2 border-b border-gray-200 text-[10px] font-mono uppercase tracking-wider text-gray-400">
            <span className="col-span-3">Brand</span>
            <span className="col-span-2">Industry</span>
            <span className="col-span-1 text-right">Signals</span>
            <span className="col-span-2">Budget</span>
            <span className="col-span-2">Fit</span>
            <span className="col-span-2 text-right">Status</span>
          </div>

          {/* Table Rows */}
          {brands.map((brand: any) => {
            const fitScore = Math.min(
              100,
              Math.round((brand.profile_confidence || 0) * 100),
            );

            return (
              <Link
                key={brand.id}
                to={`/brands/${brand.id}`}
                className="grid grid-cols-12 items-center px-6 py-3 border-b border-gray-100 hover:bg-black hover:text-white cursor-pointer transition-colors group"
              >
                {/* Entity: Logo + Name + Domain */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-white/20 flex-shrink-0 flex items-center justify-center font-mono text-[10px] font-bold text-gray-500 group-hover:text-white uppercase grayscale group-hover:grayscale-0 transition-all">
                    {brand.name
                      ?.substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {brand.name}
                    </p>
                    <p className="text-[11px] text-gray-400 group-hover:text-gray-300 truncate font-mono">
                      {brand.domain || "—"}
                    </p>
                  </div>
                </div>

                {/* Industry */}
                <div className="col-span-2 flex flex-wrap gap-1">
                  {(brand.category || []).length > 0 ? (
                    (brand.category || []).slice(0, 2).map((c: string) => (
                      <span
                        key={c}
                        className="font-mono text-[10px] uppercase text-gray-500 group-hover:text-gray-300"
                      >
                        [{c}]
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-[10px] text-gray-300">
                      —
                    </span>
                  )}
                </div>

                {/* Signals */}
                <span className="col-span-1 font-mono text-sm text-right">
                  {formatNumber(brand.signal_count || 0)}
                </span>

                {/* Budget */}
                <span className="col-span-2 font-mono text-sm uppercase">
                  {brand.budget_tier || "—"}
                </span>

                {/* Fit Score Bar */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 bg-gray-200 group-hover:bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-black group-hover:bg-white transition-all"
                      style={{ width: `${fitScore}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono w-8 text-right">
                    {fitScore}%
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2 text-right">
                  <BrandStatusPill status={brand.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Slide-Over Drawer */}
      <BrandDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
