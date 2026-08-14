"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Store, Image as ImageIcon } from "lucide-react";
import { Pagination } from "@/components/common/pagination";
import { ShopDetailDialog } from "@/components/dashboard/shop-detail-dialog";
import { ImageGalleryDialog } from "@/components/documents/image-gallery-dialog";
import {
  formatAmountCompact,
  statusForAmount,
  yearlyAmount,
} from "@/lib/dashboard/dashboard-helper";
import { extractShopName, imageCount, type DocDetails } from "@/types/shop";

const STATUS_ICON = { safe: CheckCircle2, warning: AlertTriangle, exceeded: XCircle } as const;
const STATUS_COLOR = { safe: "#10B981", warning: "#F59E0B", exceeded: "#EF4444" } as const;

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

  const totalPages = Math.max(1, Math.ceil(validShops.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageShops = validShops.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (validShops.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card text-muted-foreground">
        <Store className="h-8 w-8" />
        <p className="text-sm">ไม่มีข้อมูลร้านค้า</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary/60">
            <tr className="text-left text-[11px] font-semibold text-muted-foreground">
              <th className="w-14 px-3 py-2.5">สถานะ</th>
              <th className="px-3 py-2.5">ชื่อร้าน</th>
              <th className="px-3 py-2.5">รายวัน</th>
              <th className="px-3 py-2.5">รายเดือน</th>
              <th className="px-3 py-2.5">รายปี</th>
              <th className="px-3 py-2.5">บิล</th>
            </tr>
          </thead>
          <tbody>
            {pageShops.map((shop, i) => {
              const shopId = shop.shopid!;
              const name = extractShopName(shop, shopId);
              const daily = dailyAmount(shop);
              const monthly = monthlyAmount(shop);
              const yearly = yearlyAmount(shop);
              const status = statusForAmount(yearly);
              const StatusIcon = STATUS_ICON[status];
              const bills = imageCount(shop);

              return (
                <tr
                  key={shopId}
                  onClick={() => setSelectedShop(shop)}
                  className={cnRow(i)}
                >
                  <td className="px-3 py-2.5">
                    <StatusIcon className="h-5 w-5" style={{ color: STATUS_COLOR[status] }} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-md bg-primary p-1.5">
                        <Store className="h-3.5 w-3.5 text-primary-foreground" />
                      </span>
                      <span className="truncate font-semibold text-foreground">{name || shopId}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-[#06B6D4]">{formatAmountCompact(daily)}</td>
                  <td className="px-3 py-2.5 font-semibold text-[#8B5CF6]">{formatAmountCompact(monthly)}</td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: STATUS_COLOR[status] }}>
                    {formatAmountCompact(yearly)}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGalleryShop(shop);
                      }}
                      className={
                        "flex items-center gap-1 font-semibold hover:underline " +
                        (bills > 0 ? "text-[#10B981]" : "text-muted-foreground")
                      }
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {bills} บิล
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={validShops.length}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(rows) => {
          setRowsPerPage(rows);
          setPage(1);
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
    </div>
  );
}

function cnRow(index: number) {
  const base = "cursor-pointer border-t border-border transition-colors hover:bg-secondary/60";
  return index % 2 === 0 ? base : base + " bg-secondary/20";
}
