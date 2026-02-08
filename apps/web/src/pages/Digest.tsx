import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/formatters";
import { CheckCircle2 } from "lucide-react";

/* ─── Priority types ─── */

type QueueItem = {
  priority: "high" | "medium" | "low";
  type: string;
  title: string;
  subtitle: string;
  due: string;
  link?: string;
};

/* ─── Zero Inbox State ─── */

function ZeroInbox() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-20 h-20 rounded-full border-2 border-black flex items-center justify-center mb-6">
        <CheckCircle2 className="h-10 w-10 text-black" />
      </div>
      <p className="font-mono text-sm uppercase tracking-widest text-black mb-2">
        All Systems Nominal
      </p>
      <p className="font-mono text-xs text-gray-400">
        No actions pending. Check back later.
      </p>
    </div>
  );
}

/* ─── Queue Item Row ─── */

function QueueRow({ item }: { item: QueueItem }) {
  const priorityColor =
    item.priority === "high"
      ? "bg-black"
      : item.priority === "medium"
        ? "bg-gray-400"
        : "bg-gray-200";

  return (
    <div className="group flex items-stretch border-b border-gray-100 hover:bg-black hover:text-white transition-colors cursor-pointer">
      {/* Priority Strip */}
      <div
        className={`w-1 flex-shrink-0 ${priorityColor} group-hover:bg-white transition-colors`}
      />

      {/* Type Badge */}
      <div className="w-20 flex items-center justify-center flex-shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-wider border border-gray-200 group-hover:border-white/30 px-1.5 py-0.5 text-gray-400 group-hover:text-gray-300">
          {item.type}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 py-4 pr-4">
        <p className="text-sm font-medium tracking-tight">{item.title}</p>
        <p className="text-[11px] font-mono text-gray-500 group-hover:text-gray-300 mt-0.5">
          {item.subtitle}
        </p>
      </div>

      {/* Due / Action */}
      <div className="pr-6 flex flex-col items-end justify-center flex-shrink-0">
        <span className="font-mono text-xs font-bold">{item.due}</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400 group-hover:text-white mt-1 opacity-0 group-hover:opacity-100 transition-opacity underline underline-offset-2">
          Resolve →
        </span>
      </div>
    </div>
  );
}

/* ─── Main Action Queue ─── */

export default function Digest() {
  const { data: digest, isLoading } = useQuery({
    queryKey: ["daily-digest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_digests")
        .select("*")
        .order("digest_date", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const content = digest?.content || {};

  // Build unified queue from all sections
  const queue: QueueItem[] = [];

  // Needs Contact → High priority
  (content.needs_contact || []).forEach((item: any) => {
    queue.push({
      priority: "high",
      type: "Contact",
      title: `Add contact for ${item.brand_name}`,
      subtitle: "24h SLA — Brand has no primary contact on file",
      due: "24h",
    });
  });

  // Follow-ups Due → High priority
  (content.followups_due || []).forEach((f: any) => {
    queue.push({
      priority: "high",
      type: "Follow",
      title: `Follow up: ${f.brand_name}`,
      subtitle: `RE: ${f.deal_name || "outreach"} — response expected`,
      due: "Today",
    });
  });

  // Top Matches → Medium priority
  (content.top_matches || []).forEach((m: any) => {
    queue.push({
      priority: "medium",
      type: "Match",
      title: `${m.brand_name} × ${m.athlete_name}`,
      subtitle: `Match score: ${m.score} — review and approve`,
      due: "Review",
    });
  });

  // Deal Intel → Medium priority
  (content.deal_intel_review || []).forEach((d: any) => {
    queue.push({
      priority: "medium",
      type: "Intel",
      title: `Intel: ${d.brand_name} × ${d.athlete_name}`,
      subtitle: "48h SLA — scraped deal data needs verification",
      due: "48h",
    });
  });

  // Sort: high first, then medium, then low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <div className="-m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Daily Briefing
          </span>
          {digest && (
            <span className="font-mono text-[10px] text-gray-300">
              {formatDate(digest.digest_date)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {queue.length > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
              {queue.filter((q) => q.priority === "high").length} urgent ·{" "}
              {queue.length} total
            </span>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {queue.length > 0 && (
        <div className="flex border-b border-gray-200">
          {[
            {
              label: "Urgent",
              count: queue.filter((q) => q.priority === "high").length,
            },
            {
              label: "Review",
              count: queue.filter((q) => q.priority === "medium").length,
            },
            {
              label: "Info",
              count: queue.filter((q) => q.priority === "low").length,
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`flex-1 py-3 text-center ${
                i < 2 ? "border-r border-gray-200" : ""
              }`}
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mr-2">
                {stat.label}
              </span>
              <span className="font-mono text-sm font-bold">{stat.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 border-b border-gray-100 flex items-center px-6"
            >
              <div className="w-1 h-full bg-gray-100 mr-4" />
              <div className="w-32 h-3 skeleton" />
            </div>
          ))}
        </div>
      ) : queue.length === 0 ? (
        <ZeroInbox />
      ) : (
        /* Unified Priority Stream */
        <div>
          {queue.map((item, i) => (
            <QueueRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
