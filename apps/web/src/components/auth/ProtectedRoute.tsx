import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

function PageSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-4 w-96" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
        <div className="skeleton h-32" />
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageSkeleton />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return <Outlet />;
}
