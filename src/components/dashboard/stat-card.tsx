"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ported from ModernStatCard in dashboard_statistics_grid.dart. */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradientFrom,
  gradientTo,
  isSelected,
  onClick,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#E2E8F0]/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(248,250,252,0.72))] p-4 text-left text-foreground shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_18px_44px_rgba(15,23,42,0.09)]",
        isSelected && "border-[#94A3B8] bg-white ring-2 ring-[#0F172A]/10"
      )}
      style={{
        borderColor: isSelected ? gradientFrom : `${gradientFrom}33`,
        background: `linear-gradient(145deg, rgba(255,255,255,0.94), ${gradientFrom}10)`,
      }}
    >
      <div
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-24 blur-2xl transition group-hover:scale-110 group-hover:opacity-30"
        style={{ backgroundColor: gradientFrom }}
      />
      <div className="relative z-10">
        <div className="mb-2 flex items-start justify-between">
          <p className="max-w-[75%] text-xs font-semibold uppercase tracking-wide text-[#64748B]">{title}</p>
          <div className="rounded-full border bg-white/85 p-2 shadow-sm backdrop-blur-sm" style={{ borderColor: `${gradientFrom}45`, boxShadow: `0 10px 26px ${gradientFrom}30` }}>
            <Icon className="h-5 w-5" style={{ color: gradientTo }} />
          </div>
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight text-[#0F172A] tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}
