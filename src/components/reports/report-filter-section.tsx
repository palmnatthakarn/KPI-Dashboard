"use client";

import { Search, ArrowRight, ChevronDown } from "lucide-react";

/** Ported from ReportFilterSection (report_filter_section.dart). */
export function ReportFilterSection({
  reportTypes,
  shops,
  selectedShopId,
  selectedReportType,
  startDate,
  endDate,
  onReportTypeChange,
  onStartDateChange,
  onEndDateChange,
  onShopChange,
  onSearch,
  isLoadingShops,
}: {
  reportTypes: string[];
  shops?: { id: string; name: string }[];
  selectedShopId?: string | null;
  selectedReportType: string | null;
  startDate: string | null;
  endDate: string | null;
  onReportTypeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onShopChange?: (value: string) => void;
  onSearch?: () => void;
  isLoadingShops?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-card p-3 shadow-sm">
      <div className="relative min-w-[240px] flex-[3]">
        <select
          aria-label="ประเภทรายงาน"
          value={selectedReportType ?? ""}
          onChange={(e) => onReportTypeChange(e.target.value)}
          className="w-full appearance-none rounded-lg border-none bg-transparent py-2 pl-1 pr-6 text-sm font-semibold text-foreground outline-none"
        >
          <option value="" disabled>
            เลือกประเภทรายงาน
          </option>
          {reportTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      <div className="hidden h-6 w-px bg-border sm:block" />

      {shops && (
        <div className="relative min-w-[190px] flex-1">
          <select aria-label="ร้าน" value={selectedShopId ?? ""} onChange={(e) => onShopChange?.(e.target.value)} disabled={isLoadingShops} className="w-full appearance-none rounded-lg border border-border bg-secondary/40 px-3 py-2.5 pr-8 text-sm font-semibold outline-none">
            <option value="">{isLoadingShops ? "กำลังโหลดร้าน..." : "เลือกร้าน"}</option>
            {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-1 items-center gap-2">
        <DateField label="จากวันที่" value={startDate} onChange={onStartDateChange} />
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        <DateField label="ถึงวันที่" value={endDate} onChange={onEndDateChange} />
      </div>

      <div className="hidden h-6 w-px bg-border sm:block" />

      <button type="button" onClick={onSearch} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
        <Search className="h-4 w-4" />
        ค้นหา
      </button>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex-1 rounded-lg border border-border bg-secondary/40 px-3 py-1.5">
      <span className="block text-[10px] font-medium text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[13px] font-semibold text-foreground outline-none"
      />
    </label>
  );
}
