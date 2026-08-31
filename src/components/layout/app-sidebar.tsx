"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  FileText,
  Coins,
  Receipt,
  CalendarDays,
  Settings,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "@/components/common/theme-toggle";

/**
 * Ported 1:1 from AppSidebar.menuItems in components/app_sidebar.dart.
 * Note: the real Flutter sidebar has a single "KPI" item (KpiCombinedPage,
 * which merged the old separate KPI + KPI Journal pages in 2026) — there is
 * no standalone "KPI Journal" nav entry. An earlier scaffold pass added one
 * speculatively before this was confirmed; removed here. /kpi-journal
 * redirects to /kpi for anyone with the old link.
 */
const reportChildren = [
  { title: "งบการเงิน", href: "/financial-statements", icon: Coins },
  { title: "ภาษี", href: "/tax", icon: Receipt },
  { title: "สมุดรายวัน", href: "/daily-journal", icon: CalendarDays },
];

const menuItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "KPI", href: "/kpi", icon: LineChart },
  { title: "Reports", icon: FileText, children: reportChildren },
  { title: "Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Mobile drawer open state — sidebar renders as an overlay drawer below the tablet breakpoint. */
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);
  const reportsActive = reportChildren.some((item) => pathname === item.href);
  const [reportsOpen, setReportsOpen] = useState(reportsActive);

  useEffect(() => {
    if (reportsActive && !collapsed) setReportsOpen(true);
  }, [reportsActive, collapsed]);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          "relative z-50 flex h-screen flex-col border-r border-border/80 bg-card/80 shadow-[12px_0_40px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-200",
          "fixed md:sticky top-0",
          collapsed ? "w-[72px]" : "w-[280px] 2xl:w-[300px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className={cn("flex items-center gap-3 px-4 py-6", collapsed && "justify-center px-0 py-5")}>
          <button
            type="button"
            onClick={() => {
              if (collapsed) onToggleCollapse();
            }}
            aria-label={collapsed ? "ขยายเมนู" : "KPI Dashboard"}
            title={collapsed ? "ขยายเมนู" : undefined}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 font-semibold text-primary-foreground shadow-md transition",
              collapsed ? "cursor-pointer hover:scale-105 hover:shadow-lg" : "cursor-default"
            )}
          >
            V
          </button>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">KPI Dashboard</p>
              <p className="truncate text-xs text-muted-foreground">KPI Monitor</p>
            </div>
          )}
          {!collapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "ขยายเมนู" : "พับเมนู"}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-foreground hover:bg-accent hover:text-foreground md:flex"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = "href" in item && pathname === item.href;
            const hasChildren = "children" in item && item.children;
            const itemActive = hasChildren ? reportsActive : active;

            if (hasChildren) {
              return (
                <div key={item.title} className="space-y-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (collapsed) onToggleCollapse();
                        setReportsOpen((open) => !open);
                      }}
                      aria-expanded={collapsed ? undefined : reportsOpen}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "relative flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        itemActive
                          ? "bg-primary font-medium text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {itemActive && (
                        <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/80" />
                      )}
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </button>
                    {!collapsed && (
                      <button
                        type="button"
                        onClick={() => setReportsOpen((open) => !open)}
                        aria-label={reportsOpen ? "พับเมนู Reports" : "ขยายเมนู Reports"}
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          itemActive && "text-foreground"
                        )}
                      >
                        {reportsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                  </div>

                  {!collapsed && reportsOpen && (
                    <div className="ml-4 space-y-1 border-l border-border/80 pl-3">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onCloseMobile}
                            className={cn(
                              "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                              childActive
                                ? "bg-primary font-medium text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            {childActive && (
                              <span className="absolute left-0 top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/80" />
                            )}
                            <ChildIcon className="h-[18px] w-[18px] shrink-0" />
                            <span className="truncate">{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary font-medium text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/80" />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className={cn("mb-2", collapsed && "flex justify-center")}>
            <ThemeToggle collapsed={collapsed} />
          </div>

          {username && (
            <div
              className={cn(
                "flex items-center gap-2.5 px-1 py-2",
                collapsed && "flex-col justify-center gap-1.5 px-0"
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground">
                {username.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{username}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-safe" />
                    ออนไลน์
                  </p>
                </div>
              )}
              <div className="group relative shrink-0">
                <button
                  type="button"
                  onClick={() => logout()}
                  aria-label="ออกจากระบบ"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <span
                  role="tooltip"
                  className={cn(
                    "pointer-events-none absolute z-[60] whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                    collapsed
                      ? "bottom-1/2 left-[calc(100%+8px)] translate-y-1/2"
                      : "bottom-[calc(100%+6px)] right-0"
                  )}
                >
                  ออกจากระบบ
                </span>
              </div>
            </div>
          )}
          {!username && (
            <button
              type="button"
              onClick={() => logout()}
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              className="flex h-8 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
