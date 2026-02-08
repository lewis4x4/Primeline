import PageHeader from "@/components/shared/PageHeader";

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your NIL agency operations"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="Active Athletes" value="—" />
        <KPICard label="Open Matches" value="—" />
        <KPICard label="Active Deals" value="—" />
        <KPICard label="Pipeline Value" value="—" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="primeline-card">
          <h2 className="font-semibold text-sm mb-4">Top Matches</h2>
          <p className="text-sm text-muted-foreground">No matches yet</p>
        </div>
        <div className="primeline-card">
          <h2 className="font-semibold text-sm mb-4">Recent Deals</h2>
          <p className="text-sm text-muted-foreground">No deals yet</p>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value }: { label: string; value: string }) {
  return (
    <div className="primeline-card">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="value-display text-3xl">{value}</p>
    </div>
  );
}
