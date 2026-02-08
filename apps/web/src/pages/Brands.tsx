import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatRelativeDate } from "@/lib/formatters";
import { useState } from "react";
import { BRAND_STATUSES, BUDGET_TIERS } from "@/lib/constants";

export default function Brands() {
  const [statusFilter, setStatusFilter] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("");

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
    <div>
      <PageHeader
        title="Brands"
        description="Brand discovery and outreach pipeline"
        actions={
          <Link
            to="/brands/new"
            className="inline-flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 text-sm font-medium rounded hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add Brand
          </Link>
        }
      />

      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border rounded px-3 py-1.5 text-sm bg-background"
        >
          <option value="">All Statuses</option>
          {BRAND_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={budgetFilter}
          onChange={(e) => setBudgetFilter(e.target.value)}
          className="border border-border rounded px-3 py-1.5 text-sm bg-background"
        >
          <option value="">All Budgets</option>
          {BUDGET_TIERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      ) : !brands?.length ? (
        <EmptyState message="No brands found." />
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2 font-medium">Brand</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-right px-4 py-2 font-medium">Signals</th>
                <th className="text-left px-4 py-2 font-medium">Budget</th>
                <th className="text-left px-4 py-2 font-medium">Last Signal</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand: any) => (
                <tr key={brand.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <Link to={`/brands/${brand.id}`} className="font-medium hover:underline">
                      {brand.name}
                    </Link>
                    {brand.domain && (
                      <span className="text-xs text-muted-foreground ml-2">{brand.domain}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(brand.category || []).map((c: string) => (
                        <span key={c} className="text-xs border border-border rounded px-1.5 py-0.5">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right data-cell">
                    {formatNumber(brand.signal_count || 0)}
                  </td>
                  <td className="px-4 py-2 capitalize text-sm">
                    {brand.budget_tier || "—"}
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {brand.last_signal_date ? formatRelativeDate(brand.last_signal_date) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={brand.status} />
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
