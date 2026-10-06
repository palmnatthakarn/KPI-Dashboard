"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuthStore } from "@/store/auth-store";
import { getTokenExpiryMs, isTokenExpired } from "@/lib/auth/token-storage";
import { startEmployeeMappingsSync } from "@/lib/employee/employee-mapping-service";

const MAX_TIMEOUT_MS = 2_147_483_647;

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
    let timeoutId: number | undefined;
    let checking = false;
    let cancelled = false;

    function scheduleExpiryCheck() {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);

      const expiry = getTokenExpiryMs();
      if (expiry == null) return;

      const delay = Math.min(Math.max(expiry - Date.now(), 0), MAX_TIMEOUT_MS);
      timeoutId = window.setTimeout(checkExpiredToken, delay);
    }

    function checkExpiredToken() {
      if (isTokenExpired()) void validateAuth();
      else scheduleExpiryCheck();
    }

    async function validateAuth() {
      if (checking || cancelled) return;
      checking = true;
      try {
        await checkAuth();
      } finally {
        checking = false;
        if (!cancelled) scheduleExpiryCheck();
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") checkExpiredToken();
    }

    void validateAuth();
    window.addEventListener("focus", checkExpiredToken);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", checkExpiredToken);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkAuth]);

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

      {/* min-w-0: without it this flex item grows to its widest child (e.g. the
          KPI table's min-width) and the whole page scrolls sideways, pushing
          the sidebar off-screen. Wide content scrolls inside its own card. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border/80 bg-card/80 px-4 py-3 backdrop-blur-xl md:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="เปิดเมนู">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">KPI Dashboard</span>
        </header>

        <main className="min-w-0 flex-1 p-3 md:p-4 lg:p-5 2xl:p-6">{children}</main>
      </div>
    </div>
  );
}
