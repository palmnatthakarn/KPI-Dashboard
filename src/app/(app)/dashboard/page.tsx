"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { StatisticsGrid } from "@/components/dashboard/statistics-grid";
import { FilterSection } from "@/components/dashboard/filter-section";
import { ShopTable } from "@/components/dashboard/shop-table";

/**
 * Ported from dashboard_content.dart + DashboardBloc. Statistics grid,
 * search/filter chips and the shop table are ported 1:1.
 */
export default function DashboardPage() {
  const {
    shops,
    documentCounts,
    isDocumentCountsLoading,
    documentCountsError,
    filteredShops,
    isLoading,
    isError,
    error,
    refetch,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    dateRange,
    setDateRange,
  } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-destructive">
          โหลดข้อมูลไม่สำเร็จ: {error instanceof Error ? error.message : "unknown error"}
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Overview</h1>
      </div>

      <StatisticsGrid
        shops={shops}
        documentCounts={documentCounts}
        isDocumentCountsLoading={isDocumentCountsLoading}
        documentCountsError={documentCountsError}
        selectedFilter={selectedFilter}
        onFilterTap={setSelectedFilter}
      />

      <FilterSection
        shops={shops}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <ShopTable shops={filteredShops} />
    </div>
  );
}
