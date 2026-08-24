"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { DocumentCard } from "@/components/dashboard/document-card";
import {
  getShopCountByStatus,
  type DocumentCounts,
  type ShopStatusFilter,
} from "@/lib/dashboard/dashboard-helper";
import type { DocDetails } from "@/types/shop";

const STATUS_TILES = [
  { key: "safe", label: "กำไรต่ำกว่า 1 ล้านบาท", icon: CheckCircle2 },
  { key: "warning", label: "กำไร 1-1.8 ล้านบาท", icon: AlertTriangle },
  { key: "exceeded", label: "กำไรเกิน 1.8 ล้านบาท", icon: XCircle },
] as const;

/** Ported from DashboardStatisticsGrid in dashboard_statistics_grid.dart. */
export function StatisticsGrid({
  shops,
  documentCounts,
  isDocumentCountsLoading,
  documentCountsError,
  selectedFilter,
  onFilterTap,
  statusDeltas,
}: {
  shops: DocDetails[];
  documentCounts: DocumentCounts;
  isDocumentCountsLoading: boolean;
  documentCountsError: Error | null;
  selectedFilter: ShopStatusFilter;
  onFilterTap: (filter: ShopStatusFilter) => void;
  /** Null while the previous-period comparison is still loading. */
  statusDeltas: Record<"safe" | "warning" | "exceeded", number> | null;
}) {
  if (shops.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        ไม่มีข้อมูลร้าน
      </div>
    );
  }

  const counts = STATUS_TILES.map((tile) => ({
    ...tile,
    value: getShopCountByStatus(shops, tile.key),
  }));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {counts.map((tile) => (
        <StatTile
          key={tile.key}
          label={tile.label}
          value={tile.value}
          sublabel="ร้าน"
          icon={tile.icon}
          accent={tile.key}
          selected={selectedFilter === tile.key}
          onClick={() => onFilterTap(selectedFilter === tile.key ? "all" : tile.key)}
          delta={
            statusDeltas
              ? { change: statusDeltas[tile.key], unit: "ร้าน", label: "จากงวดก่อน" }
              : undefined
          }
        />
      ))}
      <DocumentCard
        counts={documentCounts}
        isLoading={isDocumentCountsLoading}
        error={documentCountsError}
      />
    </div>
  );
}
