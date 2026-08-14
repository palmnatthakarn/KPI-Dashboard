"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getShopCountByStatus, type ShopStatusFilter } from "@/lib/dashboard/dashboard-helper";
import { DateRangePicker, type DateRange } from "@/components/common/date-range-picker";
import type { DocDetails } from "@/types/shop";

const FILTERS: { key: ShopStatusFilter; label: string; color: string }[] = [
  { key: "all", label: "ทั้งหมด", color: "#3B82F6" },
  { key: "safe", label: "Safe", color: "#10B981" },
  { key: "warning", label: "Warning", color: "#F59E0B" },
  { key: "exceeded", label: "Exceeded", color: "#EF4444" },
];

export type { DateRange };

/** Ported from DashboardFilterSection in dashboard_filter_section.dart; date range filtering added on top. */
export function FilterSection({
  shops,
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  dateRange,
  onDateRangeChange,
}: {
  shops: DocDetails[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedFilter: ShopStatusFilter;
  onFilterChange: (filter: ShopStatusFilter) => void;
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหาชื่อร้าน หรือ Shop ID"
          className="w-full rounded-lg bg-secondary py-2 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>

      {FILTERS.map((f) => {
        const count = f.key === "all" ? shops.length : getShopCountByStatus(shops, f.key);
        const active = selectedFilter === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-[11px] font-medium transition-transform hover:scale-105",
              active ? "border-current bg-current/10" : "border-transparent bg-secondary text-muted-foreground"
            )}
            style={active ? { color: f.color } : undefined}
          >
            {active && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: f.color }} />}
            <span>{f.label}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: active ? `${f.color}33` : "#E2E8F0",
                color: active ? f.color : "#64748B",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}

      <div className="ml-auto">
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
      </div>
    </div>
  );
}
