import PageHeader from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" />

      <div className="space-y-6">
        <div className="scout-card">
          <h2 className="font-semibold text-sm mb-3">Account</h2>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm">{user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="text-sm data-cell">{user?.id || "—"}</p>
            </div>
          </div>
        </div>

        <div className="scout-card">
          <h2 className="font-semibold text-sm mb-3">Matching Engine Config</h2>
          <p className="text-sm text-muted-foreground">
            Configure matching weights and thresholds.
          </p>
        </div>
      </div>
    </div>
  );
}
