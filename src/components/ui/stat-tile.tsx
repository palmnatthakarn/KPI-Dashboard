"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccentKey } from "@/lib/design/tokens";

/** Theme-aware classes per semantic accent — see globals.css for the values. */
const ACCENT_CLASSES: Record<AccentKey, { chip: string; ring: string }> = {
  safe: { chip: "bg-status-safe-soft text-status-safe-strong", ring: "ring-status-safe" },
  warning: { chip: "bg-status-warning-soft text-status-warning-strong", ring: "ring-status-warning" },
  exceeded: { chip: "bg-status-exceeded-soft text-status-exceeded-strong", ring: "ring-status-exceeded" },
  info: { chip: "bg-info-soft text-info-strong", ring: "ring-info" },
  neutral: { chip: "bg-secondary text-muted-foreground", ring: "ring-muted-foreground" },
};

export interface StatTileProps {
  label: string;
  value: string | number;
  /** Small qualifier under the value, e.g. the unit ("ร้าน", "ฉบับ"). */
  sublabel?: string;
  icon: LucideIcon;
  /**
   * Semantic accents (safe/warning/exceeded/info) carry meaning. For tiles
   * that only need to be distinguishable, pass a hex from `categoricalPalette`
   * instead so a status color never gets used decoratively.
   */
  accent?: AccentKey | { base: string; strong: string; soft: string };
  /** Renders a skeleton in place of the value. */
  loading?: boolean;
  /** Shown instead of the value when the source request failed. */
  error?: string | null;
  /**
   * Absolute change vs. the comparison period. Deliberately not a percentage:
   * these tiles count shops, and a move from 0 to 2 has no meaningful percent.
   */
  delta?: { change: number; unit?: string; label?: string };
  /** Set when the tile doubles as a filter toggle. */
  selected?: boolean;
  onClick?: () => void;
  /** Extra content rendered under the value (e.g. the document breakdown row). */
  footer?: React.ReactNode;
}

/**
 * The app's single stat tile. Replaces three separate implementations
 * (dashboard ModernStatCard, KPI summary card, journal KpiCard) that had
 * drifted apart on radius, elevation and label styling.
 */
export function StatTile({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = "neutral",
  loading = false,
  error = null,
  delta,
  selected = false,
  onClick,
  footer,
}: StatTileProps) {
  // Semantic accents resolve through CSS variables so they follow the theme.
  // A custom triple (the categorical palette) stays inline — its tint is
  // alpha-based, which reads correctly on both light and dark surfaces.
  const semantic = typeof accent === "string" ? ACCENT_CLASSES[accent] : null;
  const custom = typeof accent === "string" ? null : accent;
  const interactive = typeof onClick === "function";
  const Root = interactive ? "button" : "div";

  return (
    <Root
      {...(interactive
        ? { type: "button" as const, onClick, "aria-pressed": selected }
        : {})}
      className={cn(
        "rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors",
        interactive &&
          "cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected ? cn("border-transparent ring-2", semantic?.ring) : "border-border"
      )}
      style={selected && custom ? { boxShadow: `0 0 0 2px ${custom.base}` } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            semantic?.chip
          )}
          style={custom ? { backgroundColor: custom.soft, color: custom.strong } : undefined}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      {error ? (
        <p className="mt-3 text-xs font-medium text-status-exceeded-strong">{error}</p>
      ) : loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-secondary" />
      ) : (
        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {typeof value === "number" ? value.toLocaleString("th-TH") : value}
          </p>
          {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        </div>
      )}

      {delta && !loading && !error && <DeltaIndicator {...delta} />}
      {footer && <div className="mt-3">{footer}</div>}
    </Root>
  );
}

/**
 * Period-over-period change. Deliberately not colored green/red by direction:
 * on this dashboard "more shops in this bucket" is not automatically good or
 * bad — it depends which bucket — so direction is carried by the arrow alone.
 */
function DeltaIndicator({ change, unit, label }: { change: number; unit?: string; label?: string }) {
  if (change === 0) {
    return (
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        <span>เท่าเดิม{label ? ` ${label}` : ""}</span>
      </p>
    );
  }

  const rising = change > 0;
  const Arrow = rising ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
      <Arrow className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="font-medium text-foreground tabular-nums">
        {rising ? "+" : "−"}
        {Math.abs(change).toLocaleString("th-TH")}
      </span>
      {unit && <span>{unit}</span>}
      {label && <span>{label}</span>}
    </p>
  );
}
