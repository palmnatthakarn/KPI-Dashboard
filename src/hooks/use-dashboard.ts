"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchShopsSummary } from "@/lib/dashboard/shop-repository";
import {
  filterShops,
  previousDateRange,
  statusCounts,
  type DocumentCounts,
  type ShopStatusFilter,
} from "@/lib/dashboard/dashboard-helper";
import { getCurrentYearDateRange } from "@/lib/api/multi-shop-service";
import { fetchKpiCombinedData } from "@/lib/kpi/kpi-combined-service";

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthDateRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toLocalIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function dashboardKpiRange(dateRange: { start: string; end: string } | null): {
  startDate: Date;
  endDate: Date;
} {
  if (dateRange) {
    return {
      startDate: parseLocalDate(dateRange.start),
      endDate: parseLocalDate(dateRange.end),
    };
  }
  const now = new Date();
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  };
}

/**
 * React Query + local UI state equivalent of DashboardBloc.
 * The 2-minute cache from the Flutter bloc is handled by React Query's
 * global `staleTime` (see app/providers.tsx) instead of bespoke timer logic.
 */
export function useDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ShopStatusFilter>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(
    currentMonthDateRange
  );

  const query = useQuery({
    queryKey: ["dashboard", "shops-summary", dateRange?.start, dateRange?.end],
    queryFn: () => fetchShopsSummary(dateRange?.start, dateRange?.end),
    // Keep showing the current table while a new date range loads instead of
    // blanking the page — a fresh queryKey per range would otherwise flip
    // isLoading back to true and unmount the filter row mid-selection.
    placeholderData: keepPreviousData,
  });

  const shops = useMemo(() => query.data ?? [], [query.data]);

  // Trend comparison. When no range is picked the main query falls back to the
  // whole current year, so the comparison has to mirror that same window.
  const comparisonRange = useMemo(() => {
    if (dateRange) return previousDateRange(dateRange);
    const year = getCurrentYearDateRange();
    return previousDateRange({ start: year.startDate, end: year.endDate });
  }, [dateRange]);

  const previousQuery = useQuery({
    queryKey: ["dashboard", "shops-summary", comparisonRange.start, comparisonRange.end],
    queryFn: () => fetchShopsSummary(comparisonRange.start, comparisonRange.end),
    // Secondary to the visible data — never let it delay first paint, and skip
    // it entirely while the main range is still resolving.
    enabled: query.isSuccess,
    placeholderData: keepPreviousData,
  });

  /**
   * Change in shop count per status vs. the previous period. Null until the
   * comparison resolves so the tiles render a value immediately rather than
   * waiting on a second request.
   */
  const statusDeltas = useMemo(() => {
    if (!previousQuery.data || !query.isSuccess) return null;
    const current = statusCounts(shops);
    const previous = statusCounts(previousQuery.data);
    return {
      safe: current.safe - previous.safe,
      warning: current.warning - previous.warning,
      exceeded: current.exceeded - previous.exceeded,
    };
  }, [previousQuery.data, query.isSuccess, shops]);

  const kpiRange = useMemo(() => dashboardKpiRange(dateRange), [dateRange]);
  const kpiQuery = useQuery({
    queryKey: [
      "dashboard",
      "kpi-summary",
      kpiRange.startDate.toDateString(),
      kpiRange.endDate.toDateString(),
    ],
    queryFn: () =>
      fetchKpiCombinedData({
        shopIds: [],
        shopNames: [],
        startDate: kpiRange.startDate,
        endDate: kpiRange.endDate,
      }),
    // Avoid racing the dashboard shop request against KPI's sequential
    // session-scoped shop selection.
    enabled: query.isSuccess && !query.isFetching,
    placeholderData: keepPreviousData,
  });

  const documentCounts = useMemo<DocumentCounts>(() => {
    const employees = kpiQuery.data?.employees;
    if (!employees) {
      // DocumentCard shows a loading skeleton in place of `total` while
      // `employees` is unset, so this value is never actually seen.
      return { total: 0, requiredToRecord: 0, recorded: 0 };
    }

    const rangeStart = new Date(
      kpiRange.startDate.getFullYear(),
      kpiRange.startDate.getMonth(),
      kpiRange.startDate.getDate()
    ).getTime();
    const rangeEnd = new Date(
      kpiRange.endDate.getFullYear(),
      kpiRange.endDate.getMonth(),
      kpiRange.endDate.getDate(),
      23,
      59,
      59,
      999
    ).getTime();

    // `total` is the same figure the KPI page shows as "จำนวนบิลทั้งหมด" (see
    // summary.totalDocuments in use-kpi-combined.ts): both sum
    // employee.totalDocuments from the SAME fetchKpiCombinedData result.
    // This part is verified working (matches KPI's total within noise when
    // both fetch cleanly) — do not change it while investigating the below.
    //
    // `requiredToRecord`/`recorded`: reverted back to the ownerAt-filtered
    // version, matching monitor's separate KpiBloc. Two attempts to make
    // these agree with `total`'s broader task scope both produced numbers
    // that didn't hold up under testing — summing task.recorded across every
    // contributor row overcounted (recorded > required, "จัดการแล้ว" over
    // 100%), and switching to employee.completedDocuments undercounted
    // badly (completedDocuments is all-or-nothing per task: a task that's
    // 90% keyed but not yet closed contributes zero). Neither `recorded` nor
    // any existing pre-aggregated field cleanly answers "documents recorded
    // so far" — that needs the real totaldocumentstatus payload from a live
    // task to nail down, which is still pending. Until then this is the last
    // known-good version: not reconciled with `total`, but internally sane
    // (recorded <= required).
    const counts: DocumentCounts = {
      total: employees.reduce((sum, employee) => sum + employee.totalDocuments, 0),
      requiredToRecord: 0,
      recorded: 0,
    };
    for (const employee of employees) {
      for (const shop of employee.shopStats) {
        for (const task of shop.tasks) {
          const ownerAt = task.ownerAt.getTime();
          if (ownerAt < rangeStart || ownerAt > rangeEnd) continue;

          if (task.isOwner) {
            counts.requiredToRecord += task.requiredToRecord;
          }
          // Monitor's referenceCount includes both the owner portion and
          // contributor/keyer rows for tasks inside the selected period.
          counts.recorded += task.recorded;
        }
      }
    }
    return counts;
  }, [kpiQuery.data?.employees, kpiRange.endDate, kpiRange.startDate]);

  const filteredShops = useMemo(
    () => filterShops(shops, searchQuery, selectedFilter),
    [shops, searchQuery, selectedFilter]
  );

  return {
    shops,
    statusDeltas,
    comparisonRange,
    /** The exact range documentCounts/statusDeltas were computed over — surface this next to those numbers so it's checkable against the KPI page's own date picker. */
    kpiRange,
    documentCounts,
    /**
     * Shops whose task/journal fetch didn't complete this round — when
     * non-empty, `documentCounts.total` is an undercount, not a wrong
     * definition. The KPI page already surfaces this same field; Overview
     * silently dropped it before, which is how a partial fetch could look
     * like a real (and misleadingly authoritative) number.
     */
    incompleteShops: kpiQuery.data?.incompleteShops ?? [],
    isDocumentCountsLoading: kpiQuery.isPending || kpiQuery.isFetching,
    documentCountsError: kpiQuery.error,
    filteredShops,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    dateRange,
    setDateRange,
  };
}
