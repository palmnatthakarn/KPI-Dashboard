"use client";

import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, FileDown, Search as SearchIcon, Loader2 } from "lucide-react";
import { SearchableMultiDropdown } from "@/components/common/searchable-multi-dropdown";
import { cn } from "@/lib/utils";
import type { KpiCombinedShopItem } from "@/types/kpi-combined";

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

function formatDisplayDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTH_LABELS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** Ported from KpiCombinedPage's filter bar (employee/shop multi-select, date range, actions, active-filter chips). */
export function KpiFilterBar({
  employeeItems,
  shops,
  shopIds,
  employeeNames,
  startDate,
  endDate,
  isSearching,
  canExport,
  onSearch,
  onReset,
  onExport,
}: {
  employeeItems: { id: string; label: string }[];
  shops: KpiCombinedShopItem[];
  shopIds: string[];
  employeeNames: string[];
  startDate: Date;
  endDate: Date;
  isSearching: boolean;
  canExport: boolean;
  onSearch: (filters: { shopIds: string[]; shopNames: string[]; startDate: Date; endDate: Date; employeeNames: string[] }) => void;
  onReset: () => void;
  onExport: () => void;
}) {
  const [draftShopIds, setDraftShopIds] = useState<string[]>(shopIds);
  const [draftEmployeeNames, setDraftEmployeeNames] = useState<string[]>(employeeNames);
  const [draftStart, setDraftStart] = useState<Date>(startDate);
  const [draftEnd, setDraftEnd] = useState<Date>(endDate);

  useEffect(() => {
    setDraftShopIds(shopIds);
    setDraftEmployeeNames(employeeNames);
    setDraftStart(startDate);
    setDraftEnd(endDate);
  }, [shopIds, employeeNames, startDate, endDate]);

  const shopItems = shops.map((s) => ({ id: s.shopId, label: s.shopName }));
  function handleSearch() {
    const shopNames = shops.filter((s) => draftShopIds.includes(s.shopId)).map((s) => s.shopName);
    onSearch({ shopIds: draftShopIds, shopNames, startDate: draftStart, endDate: draftEnd, employeeNames: draftEmployeeNames });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">พนักงาน</label>
          <SearchableMultiDropdown
            items={employeeItems}
            selectedIds={draftEmployeeNames}
            onChange={setDraftEmployeeNames}
            placeholder="ค้นหาพนักงาน..."
            allLabel="พนักงานทั้งหมด"
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">ร้าน</label>
          <SearchableMultiDropdown
            items={shopItems}
            selectedIds={draftShopIds}
            onChange={setDraftShopIds}
            placeholder="ค้นหาร้าน..."
            allLabel="ทุกร้าน"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">ช่วงวันที่</label>
          <DatePickerField value={draftStart} max={draftEnd} onChange={setDraftStart} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">วันสิ้นสุด</label>
          <DatePickerField value={draftEnd} min={draftStart} onChange={setDraftEnd} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            title="รีเซ็ตตัวกรอง"
            onClick={() => {
              onReset();
            }}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="ส่งออก PDF"
            onClick={onExport}
            disabled={!canExport}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSearching}
            onClick={handleSearch}
            className="flex h-[38px] items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
            ค้นหา
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <FilterChip label={employeeNames.length > 0 ? `${employeeNames.length} พนักงาน` : "พนักงานทั้งหมด"} />
        <FilterChip label={shopIds.length > 0 ? `${shopIds.length} ร้าน` : "ทุกร้าน"} />
        <FilterChip label={`${formatShort(startDate)} - ${formatShort(endDate)}`} />
      </div>
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">{label}</span>;
}

function DatePickerField({
  value,
  min,
  max,
  onChange,
}: {
  value: Date;
  min?: Date;
  max?: Date;
  onChange: (date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(value);

  useEffect(() => {
    if (open) setViewMonth(value);
  }, [open, value]);

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function isDisabled(day: Date) {
    return Boolean((min && isBefore(day, min)) || (max && isAfter(day, max)));
  }

  function handleSelect(day: Date) {
    if (isDisabled(day)) return;
    onChange(day);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-[38px] min-w-[128px] items-center gap-2 rounded-lg border border-transparent bg-secondary px-3 text-left text-[12px] font-medium text-foreground transition-colors hover:border-brand-blue/40",
            open && "border-brand-blue/40"
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="tabular-nums">{formatDisplayDate(value)}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className="z-50 w-[300px] rounded-2xl border border-border bg-card p-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setViewMonth((month) => subMonths(month, 1))}
              aria-label="เดือนก่อนหน้า"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-foreground">
              {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear() + 543}
            </p>
            <button
              type="button"
              onClick={() => setViewMonth((month) => addMonths(month, 1))}
              aria-label="เดือนถัดไป"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAY_LABELS.map((weekday) => (
              <span key={weekday} className="text-[10px] font-medium text-muted-foreground">
                {weekday}
              </span>
            ))}

            {days.map((day) => {
              const inCurrentMonth = isSameMonth(day, viewMonth);
              const selected = isSameDay(day, value);
              const disabled = !inCurrentMonth || isDisabled(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(day)}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-md text-xs transition-colors",
                    !inCurrentMonth && "invisible",
                    selected && "bg-brand-blue text-white",
                    !selected && !disabled && "text-foreground hover:bg-accent",
                    disabled && inCurrentMonth && "cursor-not-allowed text-muted-foreground/35"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-[11px] text-muted-foreground">{formatDisplayDate(value)}</span>
            <button
              type="button"
              onClick={() => {
                onChange(new Date());
                setOpen(false);
              }}
              disabled={isDisabled(new Date())}
              className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
            >
              วันนี้
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
