import PageHeader from "@/components/shared/PageHeader";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// Placeholder data - will be replaced with real queries
const weeklyBrands = [
  { week: "W1", count: 12 },
  { week: "W2", count: 18 },
  { week: "W3", count: 24 },
  { week: "W4", count: 31 },
];

const monthlyRevenue = [
  { month: "Jan", revenue: 0 },
  { month: "Feb", revenue: 500 },
  { month: "Mar", revenue: 3000 },
];

export default function Analytics() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Platform performance and business metrics"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="primeline-card">
          <h3 className="font-semibold text-sm mb-4">Brands Discovered / Week</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyBrands}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }} />
              <YAxis tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#000000" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="primeline-card">
          <h3 className="font-semibold text-sm mb-4">Revenue by Month</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }} />
              <YAxis tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#000000" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="primeline-card">
          <h3 className="font-semibold text-sm mb-4">Match-to-Deal Conversion</h3>
          <div className="space-y-3">
            <FunnelRow label="Matches Generated" value={500} width={100} />
            <FunnelRow label="Outreach Sent" value={75} width={60} />
            <FunnelRow label="Responses" value={30} width={40} />
            <FunnelRow label="Deals Closed" value={5} width={15} />
          </div>
        </div>

        <div className="primeline-card">
          <h3 className="font-semibold text-sm mb-4">Top Athletes by Deal Count</h3>
          <p className="text-sm text-muted-foreground">No data yet</p>
        </div>
      </div>
    </div>
  );
}

function FunnelRow({ label, value, width }: { label: string; value: number; width: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="data-cell">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded">
        <div className="h-2 bg-foreground rounded" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
