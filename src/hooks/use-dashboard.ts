"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchShopsSummary } from "@/lib/dashboard/shop-repository";
import {
  filterShops,
  getDocumentCounts,
  type DocumentCounts,
  type ShopStatusFilter,
} from "@/lib/dashboard/dashboard-helper";
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
    const importedDocumentTotal =
      kpiQuery.data?.activeDocumentTotal ?? getDocumentCounts(shops).total;
    if (!employees) {
      return { total: importedDocumentTotal, requiredToRecord: 0, recorded: 0 };
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

    // The main total comes from active /documentimagegroup records in the
    // selected import-date range. This includes documents without a task and
    // later additions to older tasks, but excludes records already deleted.
    const counts: DocumentCounts = {
      total: importedDocumentTotal,
      requiredToRecord: 0,
      recorded: 0,
    };
    // The workflow-status totals continue to match monitor's KpiBloc: the
    // date range is applied to task.ownerAt before employee rows are summed.
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
  }, [
    kpiQuery.data?.activeDocumentTotal,
    kpiQuery.data?.employees,
    kpiRange.endDate,
    kpiRange.startDate,
    shops,
  ]);

  const filteredShops = useMemo(
    () => filterShops(shops, searchQuery, selectedFilter),
    [shops, searchQuery, selectedFilter]
  );

  return {
    shops,
    documentCounts,
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
