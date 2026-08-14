"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchShopsSummary } from "@/lib/dashboard/shop-repository";
import { filterShops, type ShopStatusFilter } from "@/lib/dashboard/dashboard-helper";

/**
 * React Query + local UI state equivalent of DashboardBloc.
 * The 2-minute cache from the Flutter bloc is handled by React Query's
 * global `staleTime` (see app/providers.tsx) instead of bespoke timer logic.
 */
export function useDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ShopStatusFilter>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const query = useQuery({
    queryKey: ["dashboard", "shops-summary", dateRange?.start, dateRange?.end],
    queryFn: () => fetchShopsSummary(dateRange?.start, dateRange?.end),
    // Keep showing the current table while a new date range loads instead of
    // blanking the page — a fresh queryKey per range would otherwise flip
    // isLoading back to true and unmount the filter row mid-selection.
    placeholderData: keepPreviousData,
  });

  const shops = query.data ?? [];

  const filteredShops = useMemo(
    () => filterShops(shops, searchQuery, selectedFilter),
    [shops, searchQuery, selectedFilter]
  );

  return {
    shops,
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
