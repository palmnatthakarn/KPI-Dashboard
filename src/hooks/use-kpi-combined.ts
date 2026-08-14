"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchKpiCombinedData, getCurrentMonthRange, listKpiShops } from "@/lib/kpi/kpi-combined-service";
import { getKnownEmployees } from "@/lib/employee/employee-mapping-service";
import type { KpiCombinedEmployee, KpiCombinedShopItem } from "@/types/kpi-combined";

/**
 * Ported from KpiCombinedBloc's state shape (kpi_combined_state.dart) — the
 * "applied" filters trigger the query; the filter bar UI edits a separate
 * draft copy and only applies it when the user presses "ค้นหา", matching
 * SelectShopAndSearchCombined only firing on that button.
 */
export interface KpiFilters {
  shopIds: string[];
  shopNames: string[];
  startDate: Date;
  endDate: Date;
  employeeNames: string[];
}

function defaultFilters(): KpiFilters {
  const { startDate, endDate } = getCurrentMonthRange();
  return { shopIds: [], shopNames: [], startDate, endDate, employeeNames: [] };
}

export function useKpiCombined() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<KpiFilters>(defaultFilters);
  const [hasSearched, setHasSearched] = useState(false);
  const [forceRefreshToken, setForceRefreshToken] = useState(0);
  const [knownEmployeeNames, setKnownEmployeeNames] = useState<string[]>(() => getKnownEmployees());

  const shopsQuery = useQuery({
    queryKey: ["kpi-shops"],
    queryFn: listKpiShops,
    staleTime: 5 * 60 * 1000,
  });

  const dataQuery = useQuery({
    queryKey: [
      "kpi-combined",
      filters.shopIds.slice().sort().join(","),
      filters.startDate.toDateString(),
      filters.endDate.toDateString(),
      forceRefreshToken,
    ],
    queryFn: () =>
      fetchKpiCombinedData({
        shopIds: filters.shopIds,
        shopNames: filters.shopNames,
        startDate: filters.startDate,
        endDate: filters.endDate,
        forceRefresh: forceRefreshToken > 0,
      }),
    enabled: hasSearched,
    staleTime: 2 * 60 * 1000,
  });

  const employees: KpiCombinedEmployee[] = useMemo(
    () => dataQuery.data?.employees ?? [],
    [dataQuery.data?.employees]
  );
  const employeeNames = useMemo(() => {
    const names = new Set([...knownEmployeeNames, ...employees.map((employee) => employee.name)]);
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [employees, knownEmployeeNames]);
  const shops: KpiCombinedShopItem[] = shopsQuery.data ?? [];

  const filteredEmployees = useMemo(() => {
    if (filters.employeeNames.length === 0) return employees;
    const set = new Set(filters.employeeNames);
    return employees.filter((e) => set.has(e.name));
  }, [employees, filters.employeeNames]);

  const summary = useMemo(() => {
    return filteredEmployees.reduce(
      (acc, e) => {
        acc.totalDocuments += e.totalDocuments;
        acc.totalUploaded += e.totalUploaded;
        acc.remainingDocuments += e.remainingDocuments;
        acc.waitingVerify += e.waitingVerify;
        acc.requiredToRecordDocuments += e.requiredToRecordDocuments;
        acc.totalJournalsCombined += e.totalJournals + e.totalJournalsNoPhoto;
        return acc;
      },
      {
        totalDocuments: 0,
        totalUploaded: 0,
        remainingDocuments: 0,
        waitingVerify: 0,
        requiredToRecordDocuments: 0,
        totalJournalsCombined: 0,
      }
    );
  }, [filteredEmployees]);

  function applyFilters(next: Partial<KpiFilters>) {
    setKnownEmployeeNames(getKnownEmployees());
    setFilters((prev) => ({ ...prev, ...next }));
    setHasSearched(true);
  }

  function resetFilters() {
    setKnownEmployeeNames(getKnownEmployees());
    setFilters(defaultFilters());
    setHasSearched(false);
  }

  function refresh() {
    if (!hasSearched) return;
    setKnownEmployeeNames(getKnownEmployees());
    setForceRefreshToken((t) => t + 1);
    queryClient.invalidateQueries({ queryKey: ["kpi-combined"] });
  }

  return {
    filters,
    setFilters,
    applyFilters,
    resetFilters,
    refresh,
    hasSearched,
    shops,
    shopsLoading: shopsQuery.isLoading,
    employees,
    employeeNames,
    filteredEmployees,
    summary,
    isLoading: dataQuery.isLoading,
    isFetching: dataQuery.isFetching && !dataQuery.isLoading,
    isError: dataQuery.isError,
    error: dataQuery.error,
    incompleteShops: dataQuery.data?.incompleteShops ?? [],
  };
}
