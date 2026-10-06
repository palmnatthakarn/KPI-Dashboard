"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
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
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Search as SearchIcon, Loader2, SlidersHorizontal, X } from "lucide-react";
import { SearchableMultiDropdown } from "@/components/common/searchable-multi-dropdown";
import { EMPTY_DOC_SEARCH, isDocSearchActive, type DocLinkFilter, type DocSearch } from "@/lib/kpi/kpi-doc-search";
import { cn } from "@/lib/utils";
import type { KpiCombinedShopItem } from "@/types/kpi-combined";

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function parseDisplayDate(value: string, fallbackYear: number): Date | null {
  const trimmed = value.trim();
  const shortMatch = trimmed.match(/^(\d{2})(\d{2})$/);
  const fullMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!shortMatch && !fullMatch) return null;
  const day = Number((shortMatch ?? fullMatch)![1]);
  const month = Number((shortMatch ?? fullMatch)![2]);
  const year = shortMatch ? fallbackYear : Number(fullMatch![3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
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
  onSearch,
  docSearch,
  onDocSearchChange,
}: {
  employeeItems: { id: string; label: string }[];
  shops: KpiCombinedShopItem[];
  shopIds: string[];
  employeeNames: string[];
  startDate: Date;
  endDate: Date;
  isSearching: boolean;
  onSearch: (filters: { shopIds: string[]; shopNames: string[]; startDate: Date; endDate: Date; employeeNames: string[] }) => void;
  /** Applied document filter; edits stay a draft until "ค้นหา" is pressed. */
  docSearch: DocSearch;
  onDocSearchChange: (search: DocSearch) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(isDocSearchActive(docSearch));
  const [draftDocSearch, setDraftDocSearch] = useState<DocSearch>(docSearch);
  const searchActive = isDocSearchActive(docSearch);

  useEffect(() => {
    setDraftDocSearch(docSearch);
  }, [docSearch]);

  const [draftShopIds, setDraftShopIds] = useState<string[]>(shopIds);
  const [draftEmployeeNames, setDraftEmployeeNames] = useState<string[]>(employeeNames);
  const [draftStart, setDraftStart] = useState<Date>(startDate);
  const [draftEnd, setDraftEnd] = useState<Date>(endDate);
  const [draftStartValid, setDraftStartValid] = useState(true);
  const [draftEndValid, setDraftEndValid] = useState(true);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftShopIds(shopIds);
    setDraftEmployeeNames(employeeNames);
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setDraftStartValid(true);
    setDraftEndValid(true);
  }, [shopIds, employeeNames, startDate, endDate]);

  const shopItems = shops.map((s) => ({ id: s.shopId, label: s.shopName }));
  function handleSearch() {
    if (!draftStartValid || !draftEndValid) return;
    const shopNames = shops.filter((s) => draftShopIds.includes(s.shopId)).map((s) => s.shopName);
    onSearch({ shopIds: draftShopIds, shopNames, startDate: draftStart, endDate: draftEnd, employeeNames: draftEmployeeNames });
    onDocSearchChange(draftDocSearch);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className={cn(FILTER_GRID, "xl:items-start")}>
        <div className="min-w-0">
          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">พนักงาน</label>
          <SearchableMultiDropdown
            items={employeeItems}
            selectedIds={draftEmployeeNames}
            onChange={setDraftEmployeeNames}
            placeholder="ค้นหาพนักงาน..."
            allLabel="พนักงานทั้งหมด"
          />
        </div>
        <div className="min-w-0">
          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">ร้าน</label>
          <SearchableMultiDropdown
            items={shopItems}
            selectedIds={draftShopIds}
            onChange={setDraftShopIds}
            placeholder="ค้นหาร้าน..."
            allLabel="ทุกร้าน"
          />
        </div>
        <div className="min-w-0">
          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">วันที่เริ่มต้น</label>
          <DatePickerField
            value={draftStart}
            max={draftEnd}
            onChange={setDraftStart}
            onValidityChange={setDraftStartValid}
            inputRef={startInputRef}
            onAdvance={() => endInputRef.current?.focus()}
          />
        </div>
        <div className="min-w-0">
          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">วันที่สิ้นสุด</label>
          <DatePickerField
            value={draftEnd}
            min={draftStart}
            onChange={setDraftEnd}
            onValidityChange={setDraftEndValid}
            inputRef={endInputRef}
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-2 xl:col-span-1 xl:pt-[21px]">
          <button
            type="button"
            title="ค้นหาเพิ่มเติม"
            onClick={() => {
              // Closing clears the filter so no hidden search keeps narrowing the table.
              if (advancedOpen) {
                setDraftDocSearch(EMPTY_DOC_SEARCH);
                onDocSearchChange(EMPTY_DOC_SEARCH);
              }
              setAdvancedOpen(!advancedOpen);
            }}
            aria-label="ค้นหาเพิ่มเติม"
            aria-expanded={advancedOpen}
            aria-controls="kpi-advanced-search"
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-secondary hover:text-foreground ${
              advancedOpen ? "border-primary/40 bg-accent text-foreground" : "border-border bg-card text-muted-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {searchActive && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            disabled={isSearching || !draftStartValid || !draftEndValid}
            onClick={handleSearch}
            className="flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-5 text-[12px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60 xl:flex-none"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
            ค้นหา
          </button>
        </div>
      </div>

      {advancedOpen && (
        <div id="kpi-advanced-search" className="mt-3 border-t border-border pt-3">
          <div className={FILTER_GRID}
          >
            <div className="min-w-0">
              <label htmlFor="kpi-docno-search" className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                เลขที่เอกสาร
              </label>
              <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="kpi-docno-search"
                  type="search"
                  autoFocus
                  value={draftDocSearch.docNo}
                  onChange={(event) => setDraftDocSearch({ ...draftDocSearch, docNo: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !isSearching) handleSearch();
                  }}
                  placeholder="เช่น TR-6909-0377"
                  className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
                />
                {draftDocSearch.docNo && (
                  <button
                    type="button"
                    onClick={() => setDraftDocSearch({ ...draftDocSearch, docNo: "" })}
                    aria-label="ล้างเลขที่เอกสาร"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <span id="kpi-doc-link-label" className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                การผูกงาน
              </span>
              <div
                role="radiogroup"
                aria-labelledby="kpi-doc-link-label"
                className="grid h-10 grid-cols-3 gap-1 rounded-xl border border-border bg-secondary p-1"
              >
                {DOC_LINK_OPTIONS.map((option) => {
                  const selected = draftDocSearch.link === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setDraftDocSearch({ ...draftDocSearch, link: option.value })}
                      className={`min-w-0 truncate rounded-lg px-2 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected
                          ? "bg-card font-semibold text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">กดปุ่ม &quot;ค้นหา&quot; หรือ Enter เพื่อใช้ตัวกรอง</p>
        </div>
      )}
    </div>
  );
}

// Dropdowns may shrink (minmax(0,…)) so the dates and buttons always fit
// next to the sidebar; the advanced row reuses it to stay column-aligned.
const FILTER_GRID =
  "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(128px,150px)_minmax(128px,150px)_auto]";

const DOC_LINK_OPTIONS: { value: DocLinkFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "linked", label: "ผูกงาน" },
  { value: "unlinked", label: "ไม่ผูกงาน" },
];

function DatePickerField({
  value,
  min,
  max,
  onChange,
  onValidityChange,
  inputRef,
  onAdvance,
}: {
  value: Date;
  min?: Date;
  max?: Date;
  onChange: (date: Date) => void;
  onValidityChange: (valid: boolean) => void;
  inputRef: RefObject<HTMLInputElement>;
  onAdvance?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(value);
  const [inputValue, setInputValue] = useState(() => formatDisplayDate(value));
  const [inputInvalid, setInputInvalid] = useState(false);

  useEffect(() => {
    if (open) setViewMonth(value);
  }, [open, value]);

  useEffect(() => {
    setInputValue(formatDisplayDate(value));
    setInputInvalid(false);
    onValidityChange(true);
  }, [onValidityChange, value]);

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

  function applyTypedDate(): boolean {
    const date = parseDisplayDate(inputValue, value.getFullYear());
    if (!date || isDisabled(date)) {
      setInputInvalid(true);
      onValidityChange(false);
      return false;
    }
    setInputInvalid(false);
    onValidityChange(true);
    setInputValue(formatDisplayDate(date));
    onChange(date);
    return true;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex h-10 w-full min-w-[128px] items-center gap-2 rounded-lg border bg-secondary px-3 text-[12px] font-medium transition-colors",
          inputInvalid ? "border-destructive" : "border-transparent",
          open && !inputInvalid && "border-brand-blue/40"
        )}
      >
        <Popover.Trigger asChild>
          <button type="button" aria-label="เปิดปฏิทิน" className="rounded p-0.5 hover:bg-accent">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </Popover.Trigger>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            const parsed = parseDisplayDate(nextValue, value.getFullYear());
            const valid = Boolean(parsed && !isDisabled(parsed));
            setInputValue(nextValue);
            setInputInvalid(!valid);
            onValidityChange(valid);
          }}
          onBlur={applyTypedDate}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (applyTypedDate()) onAdvance?.();
            }
          }}
          inputMode="numeric"
          aria-label="กรอกวันที่"
          placeholder="DD/MM/YYYY"
          className="min-w-0 flex-1 bg-transparent tabular-nums outline-none placeholder:text-muted-foreground"
        />
      </div>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="isolate z-50 w-[300px] rounded-2xl border border-border bg-card p-3 opacity-100 shadow-xl"
        >
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
