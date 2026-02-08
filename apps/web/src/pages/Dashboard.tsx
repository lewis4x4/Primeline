import { useState, useEffect } from "react";

/* ─── Data ─── */

const metrics = [
  {
    label: "Active Athletes",
    value: "24",
    trend: "▲ 4 this week",
    bars: [30, 50, 40, 70, 60],
  },
  {
    label: "Open Matches",
    value: "18",
    trend: "▲ 6 new",
    bars: [40, 60, 80, 55, 90],
  },
  {
    label: "Active Deals",
    value: "7",
    trend: "2 closing this week",
    bars: [20, 45, 35, 60, 50],
  },
  {
    label: "Pipeline Value",
    value: "$184K",
    trend: "▲ 12% vs last month",
    bars: [50, 40, 65, 80, 95],
  },
];

const actions = [
  { task: "Review contract for J. Williams", due: "Due 2h" },
  { task: "Approve valuation for S. Johnson", due: "Due 4h" },
  { task: "Match found: Adidas × Track Team", due: "New" },
  { task: "Follow up: Nike partnership", due: "Due 1d" },
  { task: "Brand signal: Gatorade campaign", due: "Review" },
  { task: "Complete onboarding: M. Davis", due: "Due 3d" },
  { task: "Rate update: Instagram Reels ↑ 8%", due: "Info" },
  { task: "Send proposal to Under Armour", due: "Due 2d" },
];

const deals = [
  { athlete: "J. Williams", brand: "Nike", stage: "Negotiating", value: "$45K" },
  { athlete: "S. Johnson", brand: "Adidas", stage: "Signed", value: "$32K" },
  { athlete: "M. Davis", brand: "Gatorade", stage: "Outreach", value: "$18K" },
  { athlete: "K. Thompson", brand: "Beats", stage: "Negotiating", value: "$28K" },
  { athlete: "R. Garcia", brand: "Red Bull", stage: "Signed", value: "$52K" },
  { athlete: "A. Chen", brand: "Oakley", stage: "Outreach", value: "$12K" },
];

const ratePulse = [
  { platform: "IG Post", rate: "$1,240", delta: "▲ 3%" },
  { platform: "IG Reel", rate: "$2,100", delta: "▲ 8%" },
  { platform: "TikTok", rate: "$1,850", delta: "▼ 2%" },
  { platform: "YouTube", rate: "$4,500", delta: "▲ 5%" },
  { platform: "X Post", rate: "$680", delta: "— 0%" },
];

/* ─── Stage Pill ─── */

function StagePill({ stage }: { stage: string }) {
  if (stage === "Signed") {
    return (
      <span className="bg-black text-white text-[11px] px-2 py-0.5 rounded-none font-mono">
        {stage}
      </span>
    );
  }
  if (stage === "Negotiating") {
    return (
      <span className="border border-black text-black text-[11px] px-2 py-0.5 rounded-none font-mono">
        {stage}
      </span>
    );
  }
  return (
    <span className="border border-gray-300 text-gray-500 text-[11px] px-2 py-0.5 rounded-none font-mono">
      {stage}
    </span>
  );
}

/* ─── Main Dashboard ─── */

export default function Dashboard() {
  const [activeRow, setActiveRow] = useState(-1);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Don't capture when typing in an input or command palette is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveRow((i) => Math.min(i + 1, actions.length - 1));
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveRow((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Escape") {
        setActiveRow(-1);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="-m-6">
      {/* ─── HUD METRICS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-gray-200">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`group p-6 hover:bg-gray-50 transition-colors relative ${
              i < metrics.length - 1 ? "border-r border-gray-200" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                {m.label}
              </span>
              {/* Sparkline */}
              <div className="flex items-end gap-[2px] h-4 opacity-30 group-hover:opacity-100 transition-opacity">
                {m.bars.map((h, j) => (
                  <div
                    key={j}
                    className="w-[3px] bg-black"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tighter text-black mb-1">
              {m.value}
            </p>
            <p className="font-mono text-[11px] text-gray-400">{m.trend}</p>
          </div>
        ))}
      </div>

      {/* ─── MAIN GRID: Action Queue + Deal Flow ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 border-b border-gray-200">
        {/* Action Queue (3/5 = 60%) */}
        <div className="lg:col-span-3 lg:border-r border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Action Queue
            </span>
          </div>
          <div>
            {actions.map((a, i) => {
              const isActive = i === activeRow;
              return (
                <div
                  key={i}
                  className={`group flex items-center justify-between px-6 py-3.5 border-b border-gray-100 cursor-pointer transition-colors ${
                    isActive
                      ? "bg-black text-white"
                      : "hover:bg-black hover:text-white"
                  }`}
                  onMouseEnter={() => setActiveRow(i)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3.5 h-3.5 border flex-shrink-0 ${
                        isActive
                          ? "border-white"
                          : "border-gray-300 group-hover:border-white"
                      }`}
                    />
                    <span className="text-sm">{a.task}</span>
                  </div>
                  <span
                    className={`font-mono text-[11px] flex-shrink-0 ml-4 ${
                      isActive
                        ? "text-gray-300"
                        : "text-gray-400 group-hover:text-gray-300"
                    }`}
                  >
                    {a.due}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deal Flow (2/5 = 40%) */}
        <div className="lg:col-span-2 border-t lg:border-t-0">
          <div className="px-6 py-4 border-b border-gray-200">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Deal Flow
            </span>
          </div>
          {/* Table Header */}
          <div className="grid grid-cols-4 px-6 py-2 border-b border-gray-200 text-[10px] font-mono uppercase tracking-wider text-gray-400">
            <span>Athlete</span>
            <span>Brand</span>
            <span>Stage</span>
            <span className="text-right">Value</span>
          </div>
          {/* Table Rows */}
          {deals.map((d, i) => (
            <div
              key={i}
              className="grid grid-cols-4 items-center px-6 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium truncate">{d.athlete}</span>
              <span className="text-sm text-gray-600 truncate">{d.brand}</span>
              <span>
                <StagePill stage={d.stage} />
              </span>
              <span className="font-mono text-sm text-right">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── MARKET PULSE ─── */}
      <div className="px-6 py-4">
        <div className="mb-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Market Pulse — Median Per-Post Rates (D1, 100K+ Followers)
          </span>
        </div>
        <div className="flex flex-wrap gap-6">
          {ratePulse.map((r) => (
            <div key={r.platform} className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500">{r.platform}</span>
              <span className="font-mono text-sm font-bold">{r.rate}</span>
              <span
                className={`font-mono text-[11px] ${
                  r.delta.startsWith("▲")
                    ? "text-green-600"
                    : r.delta.startsWith("▼")
                      ? "text-red-500"
                      : "text-gray-400"
                }`}
              >
                {r.delta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
