import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import PublicLayout from "@/components/layout/PublicLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Auth = React.lazy(() => import("@/pages/Auth"));
const Athletes = React.lazy(() => import("@/pages/Athletes"));
const AthleteDetail = React.lazy(() => import("@/pages/AthleteDetail"));
const AthleteCreate = React.lazy(() => import("@/pages/AthleteCreate"));
const Brands = React.lazy(() => import("@/pages/Brands"));
const BrandDetail = React.lazy(() => import("@/pages/BrandDetail"));
const Deals = React.lazy(() => import("@/pages/Deals"));
const Matches = React.lazy(() => import("@/pages/Matches"));
const Calculator = React.lazy(() => import("@/pages/Calculator"));
const Digest = React.lazy(() => import("@/pages/Digest"));
const DealIntel = React.lazy(() => import("@/pages/DealIntel"));
const RateIntel = React.lazy(() => import("@/pages/RateIntel"));
const Leads = React.lazy(() => import("@/pages/Leads"));
const Analytics = React.lazy(() => import("@/pages/Analytics"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/auth" element={<Auth />} />
            </Route>

            {/* Dashboard routes - auth required */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="/athletes" element={<Athletes />} />
                <Route path="/athletes/new" element={<AthleteCreate />} />
                <Route path="/athletes/:id" element={<AthleteDetail />} />
                <Route path="/brands" element={<Brands />} />
                <Route path="/brands/:id" element={<BrandDetail />} />
                <Route path="/deals" element={<Deals />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/digest" element={<Digest />} />
                <Route path="/deal-intel" element={<DealIntel />} />
                <Route path="/rate-intel" element={<RateIntel />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
