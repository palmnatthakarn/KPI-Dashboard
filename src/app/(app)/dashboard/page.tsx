"use client";

import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatisticsGrid } from "@/components/dashboard/statistics-grid";
import { FilterSection } from "@/components/dashboard/filter-section";
import { ShopTable } from "@/components/dashboard/shop-table";
import { formatThaiDate } from "@/lib/utils";

/**
 * Ported from dashboard_content.dart + DashboardBloc. Statistics grid,
 * search/filter chips and the shop table are ported 1:1.
 */
export default function DashboardPage() {
  const {
    shops,
    statusDeltas,
    documentCounts,
    isDocumentCountsLoading,
    documentCountsError,
    uploadedImageCounts,
    uploadedImagesByShop,
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
    kpiRange,
    incompleteShops,
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
      <EmptyState
        icon={AlertTriangle}
        size="page"
        title="โหลดข้อมูลไม่สำเร็จ"
        description={error instanceof Error ? error.message : "unknown error"}
        action={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            ลองใหม่
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={`ภาพรวมสถานะภาษีของทุกสาขา • ข้อมูลสถิติ ณ วันที่ ${formatThaiDate(kpiRange.startDate)} - ${formatThaiDate(kpiRange.endDate)}`}
      />

      {incompleteShops.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-status-warning-soft px-4 py-2.5 text-xs text-status-warning-strong">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          โหลดข้อมูลไม่ครบสำหรับร้าน: {incompleteShops.join(", ")} — ตัวเลขสถิติด้านล่างอาจต่ำกว่าความจริง ลองรีเฟรชอีกครั้ง
        </div>
      )}

      <StatisticsGrid
        shops={shops}
        documentCounts={documentCounts}
        isDocumentCountsLoading={isDocumentCountsLoading}
        documentCountsError={documentCountsError}
        selectedFilter={selectedFilter}
        onFilterTap={setSelectedFilter}
        statusDeltas={statusDeltas}
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

      <ShopTable
        shops={filteredShops}
        uploadedImageCounts={uploadedImageCounts}
        uploadedImagesByShop={uploadedImagesByShop}
      />
    </div>
  );
}
