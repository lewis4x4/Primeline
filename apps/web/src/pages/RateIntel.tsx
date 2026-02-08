import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import MoneyDisplay from "@/components/shared/MoneyDisplay";
import { useState } from "react";

export default function RateIntel() {
  const [sportFilter, setSportFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  const { data: rateCards, isLoading } = useQuery({
    queryKey: ["rate-cards", sportFilter, platformFilter],
    queryFn: async () => {
      let query = supabase
        .from("rate_cards")
        .select("*")
        .order("platform")
        .order("follower_tier");

      if (sportFilter) query = query.eq("sport", sportFilter);
      if (platformFilter) query = query.eq("platform", platformFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Rate Intelligence"
        description="Market rate benchmarks by sport, platform, and tier"
      />

      <div className="flex gap-3 mb-4">
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="border border-border rounded px-3 py-1.5 text-sm bg-background"
        >
          <option value="">All Sports</option>
          <option value="basketball">Basketball</option>
          <option value="football">Football</option>
          <option value="volleyball">Volleyball</option>
          <option value="soccer">Soccer</option>
          <option value="gymnastics">Gymnastics</option>
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="border border-border rounded px-3 py-1.5 text-sm bg-background"
        >
          <option value="">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="twitter">X (Twitter)</option>
        </select>
      </div>

      {isLoading ? (
        <div className="skeleton h-64 w-full" />
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2 font-medium">Sport</th>
                <th className="text-left px-4 py-2 font-medium">Platform</th>
                <th className="text-left px-4 py-2 font-medium">Content</th>
                <th className="text-left px-4 py-2 font-medium">Tier</th>
                <th className="text-left px-4 py-2 font-medium">Engagement</th>
                <th className="text-right px-4 py-2 font-medium">p25</th>
                <th className="text-right px-4 py-2 font-medium">Median</th>
                <th className="text-right px-4 py-2 font-medium">p75</th>
                <th className="text-right px-4 py-2 font-medium">N</th>
              </tr>
            </thead>
            <tbody>
              {(rateCards || []).map((rc: any) => (
                <tr key={rc.id} className="border-b border-border font-mono text-xs">
                  <td className="px-4 py-2 capitalize">{rc.sport || "Global"}</td>
                  <td className="px-4 py-2 capitalize">{rc.platform}</td>
                  <td className="px-4 py-2">{rc.content_type?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2 capitalize">{rc.follower_tier}</td>
                  <td className="px-4 py-2 capitalize">{rc.engagement_tier}</td>
                  <td className="px-4 py-2 text-right">
                    <MoneyDisplay amount={rc.rate_low} size="sm" />
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    <MoneyDisplay amount={rc.rate_median} size="sm" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <MoneyDisplay amount={rc.rate_high} size="sm" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {rc.sample_size < 3 ? (
                      <span className="text-warning">Insufficient</span>
                    ) : (
                      rc.sample_size
                    )}
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
