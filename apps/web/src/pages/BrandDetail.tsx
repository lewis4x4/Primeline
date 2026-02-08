import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import VerificationBadge from "@/components/shared/VerificationBadge";
import { formatDate, formatRelativeDate } from "@/lib/formatters";
import { useState } from "react";

const TABS = ["Overview", "Contacts", "Signals", "Outreach"] as const;

export default function BrandDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Overview");

  const { data: brand, isLoading } = useQuery({
    queryKey: ["brands", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select(`
          *,
          brand_contacts(*),
          brand_signals(id, signal_type, platform, source_url, detected_at)
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
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  if (!brand) return <p className="text-muted-foreground">Brand not found.</p>;

  return (
    <div>
      <PageHeader
        title={brand.name}
        description={brand.domain || undefined}
        actions={
          <div className="flex items-center gap-2">
            <VerificationBadge verified={brand.profile_confidence >= 0.7} />
            <StatusBadge status={brand.status} />
          </div>
        }
      />

      <div className="flex gap-4 border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="scout-card">
            <p className="text-xs text-muted-foreground">Website</p>
            <p className="text-sm">{brand.website || "—"}</p>
          </div>
          <div className="scout-card">
            <p className="text-xs text-muted-foreground">Budget Tier</p>
            <p className="text-sm capitalize">{brand.budget_tier || "—"}</p>
          </div>
          <div className="scout-card">
            <p className="text-xs text-muted-foreground">Categories</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(brand.category || []).map((c: string) => (
                <span key={c} className="text-xs border border-border rounded px-1.5 py-0.5">{c}</span>
              ))}
            </div>
          </div>
          <div className="scout-card">
            <p className="text-xs text-muted-foreground">Signal Count</p>
            <p className="value-display text-2xl">{brand.signal_count}</p>
          </div>
        </div>
      )}

      {activeTab === "Contacts" && (
        <div className="space-y-2">
          {(brand.brand_contacts || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts found.</p>
          ) : (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Title</th>
                    <th className="text-left px-4 py-2 font-medium">Email</th>
                    <th className="text-left px-4 py-2 font-medium">Primary</th>
                  </tr>
                </thead>
                <tbody>
                  {(brand.brand_contacts || []).map((c: any) => (
                    <tr key={c.id} className="border-b border-border">
                      <td className="px-4 py-2">{c.full_name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.title || "—"}</td>
                      <td className="px-4 py-2 data-cell">{c.email || "—"}</td>
                      <td className="px-4 py-2">{c.is_primary ? "Yes" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "Signals" && (
        <div className="space-y-2">
          {(brand.brand_signals || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No signals detected.</p>
          ) : (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Platform</th>
                    <th className="text-left px-4 py-2 font-medium">Source</th>
                    <th className="text-left px-4 py-2 font-medium">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {(brand.brand_signals || []).slice(0, 20).map((s: any) => (
                    <tr key={s.id} className="border-b border-border">
                      <td className="px-4 py-2 capitalize">{s.signal_type?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2 capitalize">{s.platform || "—"}</td>
                      <td className="px-4 py-2">
                        {s.source_url ? (
                          <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-info hover:underline truncate block max-w-xs">
                            {new URL(s.source_url).hostname}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatRelativeDate(s.detected_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "Outreach" && (
        <p className="text-sm text-muted-foreground">Outreach timeline coming soon.</p>
      )}
    </div>
  );
}
