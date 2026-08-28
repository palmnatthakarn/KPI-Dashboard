"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRange {
  start: string;
  end: string;
}

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTH_LABELS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const PRESETS: { label: string; range: () => DateRange }[] = [
  {
    label: "7 วันล่าสุด",
    range: () => ({ start: toIso(subDays(new Date(), 6)), end: toIso(new Date()) }),
  },
  {
    label: "30 วันล่าสุด",
    range: () => ({ start: toIso(subDays(new Date(), 29)), end: toIso(new Date()) }),
  },
  {
    label: "เดือนนี้",
    range: () => ({ start: toIso(startOfMonth(new Date())), end: toIso(new Date()) }),
  },
  {
    label: "ไตรมาสนี้",
    range: () => ({ start: toIso(startOfQuarter(new Date())), end: toIso(new Date()) }),
  },
  {
    label: "6 เดือนล่าสุด",
    range: () => ({ start: toIso(subMonths(new Date(), 6)), end: toIso(new Date()) }),
  },
  {
    label: "ปีนี้",
    range: () => ({ start: toIso(new Date(new Date().getFullYear(), 0, 1)), end: toIso(new Date()) }),
  },
];

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toDisplay(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy");
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

/** Popover calendar for picking a date range; only commits (and triggers a reload) once "ยืนยัน" is pressed. */
export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => (value ? parseISO(value.start) : new Date()));
  const [pendingStart, setPendingStart] = useState<Date | null>(value ? parseISO(value.start) : null);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(value ? parseISO(value.end) : null);
  const [startInput, setStartInput] = useState(() => (value ? toDisplay(value.start) : ""));
  const [endInput, setEndInput] = useState(() => (value ? toDisplay(value.end) : ""));
  const [inputInvalid, setInputInvalid] = useState(false);
  const endInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStartInput(value ? toDisplay(value.start) : "");
    setEndInput(value ? toDisplay(value.end) : "");
    setInputInvalid(false);
  }, [value]);

  // Re-sync the calendar to the applied value every time the popover opens.
  useEffect(() => {
    if (!open) return;
    setPendingStart(value ? parseISO(value.start) : null);
    setPendingEnd(value ? parseISO(value.end) : null);
    setViewMonth(value ? parseISO(value.start) : new Date());
  }, [open, value]);

  function handleDayClick(day: Date) {
    if (!pendingStart || pendingEnd) {
      setPendingStart(day);
      setPendingEnd(null);
      return;
    }
    if (isBefore(day, pendingStart)) {
      setPendingStart(day);
      setPendingEnd(null);
    } else {
      setPendingEnd(day);
    }
  }

  function applyPreset(range: DateRange) {
    onChange(range);
    setOpen(false);
  }

  function handleApply() {
    if (!pendingStart || !pendingEnd) return;
    onChange({ start: toIso(pendingStart), end: toIso(pendingEnd) });
    setOpen(false);
  }

  function handleClear() {
    setPendingStart(null);
    setPendingEnd(null);
    onChange(null);
    setOpen(false);
  }

  const applyTypedRange = useCallback(() => {
    const startYear = value ? parseISO(value.start).getFullYear() : new Date().getFullYear();
    const endYear = value ? parseISO(value.end).getFullYear() : startYear;
    const start = parseDisplayDate(startInput, startYear);
    const end = parseDisplayDate(endInput, endYear);
    if (!start || !end || isBefore(end, start)) {
      setInputInvalid(true);
      return false;
    }
    setInputInvalid(false);
    setStartInput(toDisplay(toIso(start)));
    setEndInput(toDisplay(toIso(end)));
    onChange({ start: toIso(start), end: toIso(end) });
    return true;
  }, [endInput, onChange, startInput, value]);

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg border bg-secondary px-2 py-1.5 text-xs font-medium transition-colors",
          inputInvalid ? "border-destructive" : "border-transparent",
          open && !inputInvalid && "border-brand-blue/40"
        )}
      >
        <Popover.Trigger asChild>
          <button type="button" aria-label="เปิดปฏิทิน" className="rounded p-1 hover:bg-accent">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </Popover.Trigger>
        <input
          value={startInput}
          onChange={(event) => {
            setStartInput(event.target.value);
            setInputInvalid(false);
          }}
          onBlur={applyTypedRange}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (applyTypedRange()) endInputRef.current?.focus();
            }
          }}
          inputMode="numeric"
          aria-label="วันที่เริ่มต้น"
          placeholder="DD/MM/YYYY"
          className="w-[76px] bg-transparent text-center tabular-nums outline-none placeholder:text-muted-foreground"
        />
        <span className="text-muted-foreground">–</span>
        <input
          ref={endInputRef}
          value={endInput}
          onChange={(event) => {
            setEndInput(event.target.value);
            setInputInvalid(false);
          }}
          onBlur={applyTypedRange}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyTypedRange();
            }
          }}
          inputMode="numeric"
          aria-label="วันที่สิ้นสุด"
          placeholder="DD/MM/YYYY"
          className="w-[76px] bg-transparent text-center tabular-nums outline-none placeholder:text-muted-foreground"
        />
        {value && (
          <button
            type="button"
            aria-label="ล้างช่วงวันที่"
            onClick={() => onChange(null)}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="isolate z-50 w-[300px] rounded-2xl border border-border bg-card p-3 opacity-100 shadow-xl"
        >
          <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.range())}
                className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
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
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="เดือนถัดไป"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w} className="text-[10px] font-medium text-muted-foreground">
                {w}
              </span>
            ))}

            {days.map((day) => {
              const inCurrentMonth = isSameMonth(day, viewMonth);
              const isStart = pendingStart && isSameDay(day, pendingStart);
              const isEnd = pendingEnd && isSameDay(day, pendingEnd);
              const inRange =
                pendingStart && pendingEnd
                  ? isWithinInterval(day, { start: pendingStart, end: pendingEnd })
                  : false;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={!inCurrentMonth}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "relative flex h-8 items-center justify-center text-xs transition-colors",
                    !inCurrentMonth && "invisible",
                    inRange && !isStart && !isEnd && "bg-brand-blue/10 text-brand-blue",
                    isStart && "rounded-l-full bg-brand-blue text-white",
                    isEnd && "rounded-r-full bg-brand-blue text-white",
                    isStart && isEnd && "rounded-full",
                    !isStart && !isEnd && !inRange && "rounded-md text-foreground hover:bg-accent"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              ล้าง
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {pendingStart ? toDisplay(toIso(pendingStart)) : "dd/mm/yyyy"}
                {" – "}
                {pendingEnd ? toDisplay(toIso(pendingEnd)) : "dd/mm/yyyy"}
              </span>
              <button
                type="button"
                onClick={handleApply}
                disabled={!pendingStart || !pendingEnd}
                className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
