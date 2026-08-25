"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Store, Image as ImageIcon } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ShopDetailDialog } from "@/components/dashboard/shop-detail-dialog";
import { ImageGalleryDialog } from "@/components/documents/image-gallery-dialog";
import {
  formatAmountCompact,
  statusForAmount,
  STATUS_COLORS,
  yearlyAmount,
} from "@/lib/dashboard/dashboard-helper";
import { extractShopName, imageCount, type DocDetails } from "@/types/shop";

const STATUS_ICON = { safe: CheckCircle2, warning: AlertTriangle, exceeded: XCircle } as const;
const STATUS_LABEL = { safe: "ปกติ", warning: "เฝ้าระวัง", exceeded: "เกินเกณฑ์" } as const;

function monthlyAmount(shop: DocDetails): number {
  if (shop.monthlyAverage != null) return shop.monthlyAverage;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (!shop.monthly_summary) return 0;
  return Object.entries(shop.monthly_summary)
    .filter(([key]) => key.startsWith(monthKey))
    .reduce((sum, [, v]) => sum + (v.deposit ?? 0), 0);
}

function dailyAmount(shop: DocDetails): number {
  return shop.dailyAverage ?? 0;
}

/** Ported from ShopDataTable + BranchDataSource (shop_data_table.dart / branch_data_source.dart). */
export function ShopTable({ shops }: { shops: DocDetails[] }) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedShop, setSelectedShop] = useState<DocDetails | null>(null);
  const [galleryShop, setGalleryShop] = useState<DocDetails | null>(null);

  const validShops = useMemo(() => shops.filter((s) => !!s.shopid), [shops]);

  // A search or status filter can shrink the result set while the user is on a
  // later page. Resetting here mirrors Flutter's paginated data source and
  // avoids briefly showing an empty/clamped page after the filter changes.
  useEffect(() => {
    setPage(1);
  }, [shops]);

  const totalPages = Math.max(1, Math.ceil(validShops.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageShops = validShops.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const columns: Column<DocDetails>[] = [
    {
      id: "status",
      header: "สถานะ",
      width: "w-16",
      cell: (shop) => {
        const status = statusForAmount(yearlyAmount(shop));
        const Icon = STATUS_ICON[status];
        return (
          <Icon
            className="h-5 w-5"
            style={{ color: STATUS_COLORS[status].icon }}
            aria-label={STATUS_LABEL[status]}
          />
        );
      },
    },
    {
      id: "name",
      header: "ชื่อร้าน",
      cell: (shop) => {
        const shopId = shop.shopid!;
        return (
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-primary p-1.5">
              <Store className="h-3.5 w-3.5 text-primary-foreground" />
            </span>
            <span className="truncate font-semibold text-foreground">
              {extractShopName(shop, shopId) || shopId}
            </span>
          </div>
        );
      },
    },
    {
      id: "daily",
      header: "รายวัน",
      align: "right",
      cellClassName: "font-semibold text-foreground tabular-nums",
      cell: (shop) => formatAmountCompact(dailyAmount(shop)),
    },
    {
      id: "monthly",
      header: "รายเดือน",
      align: "right",
      cellClassName: "font-semibold text-foreground tabular-nums",
      cell: (shop) => formatAmountCompact(monthlyAmount(shop)),
    },
    {
      id: "yearly",
      header: "รายปี",
      align: "right",
      cellClassName: "font-semibold tabular-nums",
      cell: (shop) => {
        const yearly = yearlyAmount(shop);
        const status = statusForAmount(yearly);
        return <span style={{ color: STATUS_COLORS[status].text }}>{formatAmountCompact(yearly)}</span>;
      },
    },
    {
      id: "bills",
      header: "บิล",
      align: "right",
      cell: (shop) => {
        const bills = imageCount(shop);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setGalleryShop(shop);
            }}
            className={
              "ml-auto flex items-center gap-1 rounded font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (bills > 0 ? "text-status-safe-strong" : "text-muted-foreground")
            }
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {bills} บิล
          </button>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={pageShops}
        getRowKey={(shop) => shop.shopid!}
        onRowClick={setSelectedShop}
        getRowLabel={(shop) => `ดูรายละเอียด ${extractShopName(shop, shop.shopid!) || shop.shopid}`}
        minWidth={860}
        zebra
        emptyState={<EmptyState icon={Store} title="ไม่มีข้อมูลร้านค้า" />}
        pagination={{
          currentPage,
          rowsPerPage,
          totalItems: validShops.length,
          onPageChange: setPage,
          onRowsPerPageChange: (rows) => {
            setRowsPerPage(rows);
            setPage(1);
          },
        }}
      />

      {selectedShop && <ShopDetailDialog shop={selectedShop} onClose={() => setSelectedShop(null)} />}
      {galleryShop && (
        <ImageGalleryDialog
          shopId={galleryShop.shopid ?? ""}
          shopName={extractShopName(galleryShop, galleryShop.shopid ?? "")}
          onClose={() => setGalleryShop(null)}
        />
      )}
    </>
  );
}
