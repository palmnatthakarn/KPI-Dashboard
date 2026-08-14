"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { DocumentCard } from "@/components/dashboard/document-card";
import { getShopCountByStatus, getDocumentCounts, type ShopStatusFilter } from "@/lib/dashboard/dashboard-helper";
import type { DocDetails } from "@/types/shop";

/** Ported from DashboardStatisticsGrid in dashboard_statistics_grid.dart. */
export function StatisticsGrid({
  shops,
  selectedFilter,
  onFilterTap,
}: {
  shops: DocDetails[];
  selectedFilter: ShopStatusFilter;
  onFilterTap: (filter: ShopStatusFilter) => void;
}) {
  const numFmt = new Intl.NumberFormat("th-TH");

  if (shops.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">ไม่มีข้อมูลร้าน</div>
    );
  }

  const documentCounts = getDocumentCounts(shops);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="กำไรต่ำกว่า 1 ล้านบาท"
        value={numFmt.format(getShopCountByStatus(shops, "safe"))}
        subtitle="ร้าน"
        icon={CheckCircle2}
        gradientFrom="#16A34A"
        gradientTo="#15803D"
        isSelected={selectedFilter === "safe"}
        onClick={() => onFilterTap(selectedFilter === "safe" ? "all" : "safe")}
      />
      <StatCard
        title="กำไร 1-1.8 ล้านบาท"
        value={numFmt.format(getShopCountByStatus(shops, "warning"))}
        subtitle="ร้าน"
        icon={AlertTriangle}
        gradientFrom="#F59E0B"
        gradientTo="#B45309"
        isSelected={selectedFilter === "warning"}
        onClick={() => onFilterTap(selectedFilter === "warning" ? "all" : "warning")}
      />
      <StatCard
        title="กำไรเกิน 1.8 ล้านบาท"
        value={numFmt.format(getShopCountByStatus(shops, "exceeded"))}
        subtitle="ร้าน"
        icon={XCircle}
        gradientFrom="#EF4444"
        gradientTo="#B91C1C"
        isSelected={selectedFilter === "exceeded"}
        onClick={() => onFilterTap(selectedFilter === "exceeded" ? "all" : "exceeded")}
      />
      <DocumentCard counts={documentCounts} />
    </div>
  );
}
