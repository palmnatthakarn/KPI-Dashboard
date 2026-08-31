"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuthStore } from "@/store/auth-store";
import { startEmployeeMappingsSync } from "@/lib/employee/employee-mapping-service";

/**
 * Route-group shell for all authenticated pages.
 * Ported from layouts/main_layout.dart: guards on AuthBloc state, renders
 * AppSidebar + page content, collapses to a 72px rail on tablet widths.
 */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, checkAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    void checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void startEmployeeMappingsSync()
      .then((stop) => {
        if (cancelled) stop();
        else unsubscribe = stop;
      })
      .catch((error) => console.error("Unable to start employee mapping sync", error));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [status]);

  // Auto-collapse in the tablet band (600–800px), matching
  // ResponsiveHelper.getSidebarWidth's ScreenType.tablet -> 72px case.
  useEffect(() => {
    function onResize() {
      const w = window.innerWidth;
      setCollapsed(w >= 600 && w < 800);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (status === "idle" || status === "authenticating") {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  if (status !== "authenticated") return null;

  return (
    <div className="flex min-h-screen bg-transparent">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border/80 bg-card/80 px-4 py-3 backdrop-blur-xl md:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="เปิดเมนู">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">KPI Dashboard</span>
        </header>

        <main className="flex-1 p-3 md:p-4 lg:p-5 2xl:p-6">{children}</main>
      </div>
    </div>
  );
}
