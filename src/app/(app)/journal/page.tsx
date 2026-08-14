"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowLeft,
  Wallet,
  Download,
  Table as TableIcon,
  FileText,
  Code2,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { Journal } from "@/types/journal";
import { useJournalsForShop } from "@/hooks/use-journal";
import { accountClassFromString, typeColor, typeDisplay } from "@/lib/journal/account-class";
import { getDateRange, journalDateTime, formatNumber, type DateFilter } from "@/lib/journal/journal-helpers";
import type { DateRange } from "@/components/common/date-range-picker";
import { JournalKpiSection } from "@/components/journal/journal-kpi-section";
import { JournalToolbar } from "@/components/journal/journal-toolbar";
import { JournalTable } from "@/components/journal/journal-table";
import { JournalChart } from "@/components/journal/journal-chart";
import { JournalEmptyState } from "@/components/journal/journal-empty-state";
import { JournalSummaryBar } from "@/components/journal/journal-summary-bar";

/** Ported from JournalPage (journal_page.dart) — the transaction drill-down opened from a Dashboard shop row / detail dialog. */
export default function JournalPageRoute() {
  return (
    <Suspense>
      <JournalPageContent />
    </Suspense>
  );
}

function JournalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchSync = searchParams.get("shop") ?? "";

  const { data, isLoading, isError, error } = useJournalsForShop(branchSync);
  const journals = useMemo(() => data?.data ?? [], [data]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortAscending, setSortAscending] = useState(true);
  const [isChartView, setIsChartView] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "loading" | "success" } | null>(null);

  const filtered = useMemo(() => {
    const dateRange = getDateRange(dateFilter, customRange);
    let res = journals.filter((j) => {
      if (!dateRange) return true;
      const date = journalDateTime(j);
      if (!date) return false;
      return date.getTime() >= dateRange.start.getTime() && date.getTime() < dateRange.end.getTime();
    });

    if (typeFilter !== "ALL") {
      res = res.filter((j) => accountClassFromString(j.accounttype) === typeFilter.toLowerCase());
    }

    const q = search.trim().toLowerCase();
    if (q) {
      res = res.filter((j) => (j.docno ?? "").toLowerCase().includes(q) || (j.accountname ?? "").toLowerCase().includes(q));
    }

    const list = [...res];
    if (sortColumnIndex !== null) {
      sortJournals(list, sortColumnIndex);
      if (!sortAscending) list.reverse();
    }
    return list;
  }, [journals, dateFilter, customRange, typeFilter, search, sortColumnIndex, sortAscending]);

  const income = calcIncome(filtered);
  const expenses = calcExpenses(filtered);
  const profit = income - expenses;
  const totalDebit = filtered.reduce((sum, j) => sum + (j.debit ?? 0), 0);
  const totalCredit = filtered.reduce((sum, j) => sum + (j.credit ?? 0), 0);

  function handleReset() {
    setSearch("");
    setTypeFilter("ALL");
    setDateFilter("ALL");
    setCustomRange(null);
    setSortColumnIndex(null);
    setSortAscending(true);
  }

  function handleExport(type: "Excel" | "PDF" | "CSV") {
    setToast({ message: `กำลังดาวน์โหลดรายงาน ${type}...`, variant: "loading" });
    setTimeout(() => setToast({ message: `ดาวน์โหลดรายงาน ${type} สำเร็จ`, variant: "success" }), 1500);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] flex-col bg-[#F8FAFC] sm:-m-6">
      {/* App bar */}
      <div className="flex items-center gap-4 border-b border-[#E5E7EB] bg-white px-3 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-[#E5E7EB] p-2 text-[#6B7280] hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] p-2.5 shadow-sm">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold tracking-tight text-[#111827]">Journal</p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
              <p className="truncate text-[11px] font-medium text-[#6B7280]">
                สาขา: {branchSync || "-"} • {filtered.length} รายการ
              </p>
            </div>
          </div>
        </div>
        <div className="ml-auto">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className="rounded-xl bg-[#F3F4F6] p-2.5 text-[#374151] hover:bg-accent" title="ส่งออกข้อมูล">
                <Download className="h-5 w-5" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-[220px] rounded-2xl border border-border bg-white p-2 shadow-lg">
                <p className="px-3 py-2 text-sm font-bold text-[#111827]">ส่งออกข้อมูล</p>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <ExportItem icon={TableIcon} color="#10B981" title="Excel (.xlsx)" subtitle="เหมาะสำหรับนำไปคำนวณต่อ" onClick={() => handleExport("Excel")} />
                <ExportItem icon={FileText} color="#EF4444" title="PDF Document" subtitle="เอกสารสำหรับการพิมพ์" onClick={() => handleExport("PDF")} />
                <ExportItem icon={Code2} color="#3B82F6" title="CSV File" subtitle="ไฟล์ข้อมูลดิบ" onClick={() => handleExport("CSV")} />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {!branchSync ? (
        <div className="p-6">
          <JournalEmptyState title="ไม่พบสาขา" subtitle="กรุณาเปิดหน้านี้จากรายละเอียดสาขาในแดชบอร์ด" />
        </div>
      ) : isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดข้อมูล...
        </div>
      ) : isError ? (
        <div className="p-6">
          <JournalEmptyState title="โหลดข้อมูลไม่สำเร็จ" subtitle={error instanceof Error ? error.message : "เกิดข้อผิดพลาด"} />
        </div>
      ) : (
        <>
          <JournalKpiSection income={income} expenses={expenses} profit={profit} />

          <JournalToolbar
            search={search}
            onSearchChange={setSearch}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            isChartView={isChartView}
            onViewToggle={setIsChartView}
          />

          <div className="mx-3 my-3 flex-1 overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-sm">
            {filtered.length === 0 ? (
              <JournalEmptyState title="ไม่พบรายการ" subtitle="ลองเปลี่ยนตัวกรองหรือเคลียร์คำค้นหา" />
            ) : isChartView ? (
              <JournalChart rows={filtered} />
            ) : (
              <div className="p-4">
                <JournalTable
                  rows={filtered}
                  typeColor={typeColor}
                  typeDisplay={typeDisplay}
                  numFmt={formatNumber}
                  sortColumnIndex={sortColumnIndex}
                  sortAscending={sortAscending}
                  onSort={(index, ascending) => {
                    setSortColumnIndex(index);
                    setSortAscending(ascending);
                  }}
                />
              </div>
            )}
          </div>

          <JournalSummaryBar totalDebit={formatNumber(totalDebit)} totalCredit={formatNumber(totalCredit)} />
        </>
      )}

      {branchSync && !isLoading && !isError && (
        <button
          type="button"
          onClick={handleReset}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_12px_-2px_rgba(59,130,246,0.3)] hover:brightness-105"
        >
          <RefreshCw className="h-4 w-4" />
          รีเซ็ต
        </button>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-lg">
          {toast.variant === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

function ExportItem({
  icon: Icon,
  color,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof TableIcon;
  color: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <DropdownMenu.Item
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 outline-none hover:bg-accent"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1A` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </span>
      <span className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </span>
    </DropdownMenu.Item>
  );
}

// ── Filter/sort/calc helpers, ported 1:1 from _JournalPageState methods ────

function calcIncome(list: Journal[]): number {
  let total = 0;
  for (const j of list) {
    if (accountClassFromString(j.accounttype) === "income") total += (j.credit ?? 0) - (j.debit ?? 0);
  }
  return total;
}

function calcExpenses(list: Journal[]): number {
  let total = 0;
  for (const j of list) {
    const cls = accountClassFromString(j.accounttype);
    if (cls === "expenses" || cls === "liabilities") total += (j.debit ?? 0) - (j.credit ?? 0);
  }
  return total;
}

function sortJournals(list: Journal[], columnIndex: number) {
  switch (columnIndex) {
    case 0:
      list.sort((a, b) => (journalDateTime(a)?.getTime() ?? 0) - (journalDateTime(b)?.getTime() ?? 0));
      break;
    case 1:
      list.sort((a, b) => (a.docno ?? "").localeCompare(b.docno ?? ""));
      break;
    case 2:
      list.sort((a, b) => (a.accountname ?? "").localeCompare(b.accountname ?? ""));
      break;
    case 3:
      list.sort((a, b) => typeDisplay(a.accounttype).localeCompare(typeDisplay(b.accounttype)));
      break;
    case 4:
      list.sort((a, b) => (a.debit ?? 0) - (b.debit ?? 0));
      break;
    case 5:
      list.sort((a, b) => (a.credit ?? 0) - (b.credit ?? 0));
      break;
  }
}
