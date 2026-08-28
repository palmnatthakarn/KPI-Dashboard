"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { X, Store } from "lucide-react";
import { formatTHB } from "@/lib/utils";
import {
  countDocumentImageGroups,
  type DocumentImage,
} from "@/types/document-image";
import { extractShopName, totalDeposit, totalWithdraw, type DocDetails } from "@/types/shop";
import { ImageGalleryDialog } from "@/components/documents/image-gallery-dialog";

/**
 * Simplified port of BranchDetailDialog (branch_detail_dialog.dart).
 * The image gallery opens ImageGalleryDialog directly (matching
 * image_gallery_dialog.dart, triggered via showDialog in the Flutter
 * source — there's no standalone "Documents" route/page in the app).
 */
export function ShopDetailDialog({
  shop,
  uploadedImages,
  onClose,
}: {
  shop: DocDetails;
  uploadedImages: DocumentImage[];
  onClose: () => void;
}) {
  const shopId = shop.shopid ?? "";
  const name = extractShopName(shop, shopId);
  const [galleryOpen, setGalleryOpen] = useState(false);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-5 shadow-lg">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary p-2">
                <Store className="h-5 w-5 text-primary-foreground" />
              </span>
              <div>
                <Dialog.Title className="text-sm font-semibold">{name || shopId}</Dialog.Title>
                <p className="text-xs text-muted-foreground">รหัสร้าน: {shopId}</p>
              </div>
            </div>
            <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Row label="รายรับรวม" value={formatTHB(totalDeposit(shop))} />
            <Row label="รายจ่ายรวม" value={formatTHB(totalWithdraw(shop))} />
            <Row label="รายวันเฉลี่ย" value={formatTHB(shop.dailyAverage ?? 0)} />
            <Row label="รายเดือนเฉลี่ย" value={formatTHB(shop.monthlyAverage ?? 0)} />
            <Row label="รายปี" value={formatTHB(shop.yearlyAverage ?? 0)} />
            <Row
              label="รูปที่อัปโหลด"
              value={`${countDocumentImageGroups(uploadedImages)} รูป`}
            />
          </dl>

          {shop.responsible?.name && (
            <p className="mt-4 text-xs text-muted-foreground">
              ผู้รับผิดชอบ: {shop.responsible.name}
              {shop.responsible.role ? ` (${shop.responsible.role})` : ""}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Link
              href={`/journal?shop=${encodeURIComponent(shopId)}`}
              className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              ดูสมุดรายวัน
            </Link>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              ดูรูปเอกสาร
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {galleryOpen && (
        <ImageGalleryDialog
          shopName={name || shopId}
          images={uploadedImages}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </Dialog.Root>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}
