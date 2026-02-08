import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import { formatNumber, formatDate } from "@/lib/formatters";
import { useState } from "react";

export default function Leads() {
  const [qualifiedOnly, setQualifiedOnly] = useState(false);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["calculator-leads", qualifiedOnly],
    queryFn: async () => {
      let query = supabase
        .from("calculator_leads")
        .select("*")
        .order("lead_score", { ascending: false });

      if (qualifiedOnly) query = query.eq("qualified", true);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Calculator Leads"
        description="Inbound leads from the public NIL calculator"
        actions={
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={qualifiedOnly}
              onChange={(e) => setQualifiedOnly(e.target.checked)}
              className="rounded border-border"
            />
            Qualified only
          </label>
        }
      />

      {isLoading ? (
        <div className="skeleton h-64 w-full" />
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">School</th>
                <th className="text-left px-4 py-2 font-medium">Sport</th>
                <th className="text-right px-4 py-2 font-medium">Followers</th>
                <th className="text-right px-4 py-2 font-medium">Score</th>
                <th className="text-center px-4 py-2 font-medium">Qualified</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {(leads || []).map((lead: any) => {
                const totalFollowers =
                  (lead.instagram_followers || 0) +
                  (lead.tiktok_followers || 0) +
                  (lead.twitter_followers || 0) +
                  (lead.youtube_subscribers || 0);
                return (
                  <tr key={lead.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-2 font-medium">{lead.full_name || "—"}</td>
                    <td className="px-4 py-2 data-cell">{lead.email}</td>
                    <td className="px-4 py-2">{lead.school || "—"}</td>
                    <td className="px-4 py-2 capitalize">{lead.sport || "—"}</td>
                    <td className="px-4 py-2 text-right data-cell">{formatNumber(totalFollowers)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="data-cell font-medium">{lead.lead_score}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {lead.qualified ? (
                        <span className="text-success text-xs font-medium">Yes</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2 capitalize text-sm">{lead.status}</td>
                    <td className="px-4 py-2 text-muted-foreground text-sm">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
