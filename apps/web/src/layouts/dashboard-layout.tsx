import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { env } from "@/env";
import { useSession } from "@/lib/auth-client";
import { ROUTES } from "@/lib/routes";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export function DashboardLayout() {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  // Bypass auth in development mode
  const bypassAuth = env.VITE_DEV_BYPASS_AUTH;

  // Show loading while checking auth (skip if bypassing)
  if (isPending && !bypassAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated (skip if bypassing)
  if (!session && !bypassAuth) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - desktop only */}
      <DashboardSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
