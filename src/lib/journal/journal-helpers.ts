import type { Journal } from "@/types/journal";

/** Ported from Journal.dateTime / Journal.displayDate getters (journal.dart). */
export function journalDateTime(j: Journal): Date | null {
  if (!j.docdate) return null;
  const d = new Date(j.docdate);
  return isNaN(d.getTime()) ? null : d;
}

export function journalDisplayDate(j: Journal): string {
  const d = journalDateTime(j);
  if (!d) return j.docdate ?? "-";
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

const numFmt = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numFmt.format(value);
}

/** Ported from NumberFormat.compactCurrency(symbol: '') used for KPI cards. */
export function formatCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

export type DateFilter = "ALL" | "TODAY" | "MONTH" | "QUARTER" | "3QUARTERS" | "6MONTHS" | "YEAR" | "CUSTOM";

/** Ported 1:1 from _getDateRange in journal_page.dart; CUSTOM added for the user-typed range. */
export function getDateRange(
  filter: DateFilter,
  customRange?: { start: string; end: string } | null
): { start: Date; end: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const addDays = (d: Date, days: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return r;
  };
  const addMonths = (d: Date, months: number) => {
    const r = new Date(d);
    r.setMonth(r.getMonth() + months);
    return r;
  };

  switch (filter) {
    case "TODAY":
      return { start: today, end: addDays(today, 1) };
    case "MONTH":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: addDays(today, 1) };
    case "QUARTER": {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      return { start: new Date(now.getFullYear(), quarterMonth, 1), end: addDays(today, 1) };
    }
    case "3QUARTERS": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startQuarter = Math.max(0, Math.min(3, currentQuarter - 2));
      const startMonth = startQuarter * 3;
      const startYear = currentQuarter < 2 ? now.getFullYear() - 1 : now.getFullYear();
      return { start: new Date(startYear, startMonth, 1), end: addDays(today, 1) };
    }
    case "6MONTHS":
      return { start: addMonths(today, -6), end: addDays(today, 1) };
    case "YEAR":
      return { start: new Date(now.getFullYear(), 0, 1), end: addDays(today, 1) };
    case "CUSTOM":
      if (!customRange) return null;
      return { start: new Date(`${customRange.start}T00:00:00`), end: addDays(new Date(`${customRange.end}T00:00:00`), 1) };
    default:
      return null;
  }
}

export const DATE_FILTERS: [DateFilter, string][] = [
  ["ALL", "ทั้งหมด"],
  ["TODAY", "วันนี้"],
  ["MONTH", "เดือนนี้"],
  ["QUARTER", "ไตรมาสนี้"],
  ["3QUARTERS", "3 ไตรมาส"],
  ["6MONTHS", "6 เดือนล่าสุด"],
  ["YEAR", "ปีนี้"],
  ["CUSTOM", "กำหนดเอง"],
];
