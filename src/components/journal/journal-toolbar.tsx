"use client";

import { Search, X, Table as TableIcon, BarChart3, LayoutGrid, Landmark, CreditCard, PieChart, TrendingUp, TrendingDown, Calendar, ChevronDown } from "lucide-react";
import { DATE_FILTERS, type DateFilter } from "@/lib/journal/journal-helpers";
import { DateRangePicker, type DateRange } from "@/components/common/date-range-picker";

const TYPE_FILTERS: [string, string, typeof LayoutGrid][] = [
  ["ALL", "ทั้งหมด", LayoutGrid],
  ["ASSETS", "1 สินทรัพย์", Landmark],
  ["LIABILITIES", "2 หนี้สิน", CreditCard],
  ["EQUITY", "3 ทุน", PieChart],
  ["INCOME", "4 รายได้", TrendingUp],
  ["EXPENSES", "5 ค่าใช้จ่าย", TrendingDown],
];

const TYPE_COLORS: Record<string, string> = {
  INCOME: "#10B981",
  EXPENSES: "#EF4444",
  ASSETS: "#3B82F6",
  LIABILITIES: "#F59E0B",
  EQUITY: "#8B5CF6",
};

/** Ported from _buildSimpleToolbar (journal_page.dart). */
export function JournalToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  dateFilter,
  onDateFilterChange,
  customRange,
  onCustomRangeChange,
  isChartView,
  onViewToggle,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (v: DateFilter) => void;
  customRange: DateRange | null;
  onCustomRangeChange: (v: DateRange | null) => void;
  isChartView: boolean;
  onViewToggle: (chart: boolean) => void;
}) {
  return (
    <div className="mx-3 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-[38px] flex-1 items-center rounded-xl border border-[#E5E7EB] bg-white px-4 shadow-sm">
          <Search className="h-[18px] w-[18px] shrink-0 text-[#6B7280]" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาเลขที่เอกสาร, รายการ..."
            className="ml-2 w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-[#9CA3AF] focus:outline-none"
          />
          {search && (
            <button onClick={() => onSearchChange("")} type="button">
              <X className="h-[18px] w-[18px] text-[#9CA3AF]" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onViewToggle(false)}
            className={`rounded-lg p-2 ${!isChartView ? "bg-[#EFF6FF] text-[#3B82F6]" : "text-[#6B7280]"}`}
          >
            <TableIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewToggle(true)}
            className={`rounded-lg p-2 ${isChartView ? "bg-[#EFF6FF] text-[#3B82F6]" : "text-[#6B7280]"}`}
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {TYPE_FILTERS.map(([value, label, Icon]) => {
            const isSelected = typeFilter === value;
            const color = TYPE_COLORS[value] ?? "#6B7280";
            return (
              <button
                key={value}
                type="button"
                onClick={() => onTypeFilterChange(value)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-shadow"
                style={
                  isSelected
                    ? { backgroundColor: color, borderColor: color, color: "#fff", boxShadow: `0 2px 8px ${color}4D` }
                    : { backgroundColor: "#fff", borderColor: "#E5E7EB", color: "#374151" }
                }
              >
                <Icon className="h-3.5 w-3.5" style={{ color: isSelected ? "#fff" : color }} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative shrink-0">
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
            className="appearance-none rounded-full border border-[#E5E7EB] bg-white py-1.5 pl-8 pr-7 text-[11px] font-semibold text-foreground shadow-sm focus:outline-none"
          >
            {DATE_FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#3B82F6]" />
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
        </div>

        {dateFilter === "CUSTOM" && (
          <DateRangePicker value={customRange} onChange={onCustomRangeChange} />
        )}
      </div>
    </div>
  );
}
