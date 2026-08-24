"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FileText, Image as ImageIcon, Inbox, Loader2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchShopImages } from "@/lib/api/document-image-service";
import type { DocumentImage } from "@/types/document-image";

const PDF_CATEGORY = "ไฟล์ PDF";
const IMAGE_CATEGORY = "รูปภาพ (JPG/PNG)";

function categorize(img: DocumentImage): string {
  const url = (img.imageUrl ?? "").toLowerCase();
  return url.endsWith(".pdf") ? PDF_CATEGORY : IMAGE_CATEGORY;
}

/**
 * Ported from ImageGalleryDialog (image_gallery_dialog.dart) — read-only
 * categorized image/PDF viewer opened from the Dashboard's shop row. Note:
 * there is no approve/reject workflow in the Flutter source (ImageApprovalBloc
 * is provided app-wide but has zero consumers anywhere — confirmed dead
 * code), so none is added here either.
 */
export function ImageGalleryDialog({ shopId, shopName, onClose }: { shopId: string; shopName: string; onClose: () => void }) {
  const { data: images, isLoading, isError } = useQuery({
    queryKey: ["shop-images", shopId],
    queryFn: () => fetchShopImages(shopId),
    staleTime: 2 * 60 * 1000,
  });

  const categorized = useMemo(() => {
    const map = new Map<string, DocumentImage[]>();
    for (const img of images ?? []) {
      const cat = categorize(img);
      const list = map.get(cat) ?? [];
      list.push(img);
      map.set(cat, list);
    }
    return map;
  }, [images]);

  const categories = Array.from(categorized.keys());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailImage, setDetailImage] = useState<DocumentImage | null>(null);

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) setSelectedCategory(categories[0]);
  }, [categories, selectedCategory]);

  const activeImages = selectedCategory ? categorized.get(selectedCategory) ?? [] : [];

  function handleCardClick(img: DocumentImage) {
    if (categorize(img) === PDF_CATEGORY) {
      if (img.imageUrl) window.open(img.imageUrl, "_blank", "noopener,noreferrer");
    } else {
      setDetailImage(img);
    }
  }

  return (
    <>
      <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[85vh] w-[min(900px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div>
                <Dialog.Title className="text-sm font-semibold">รูปเอกสาร — {shopName}</Dialog.Title>
                <p className="text-xs text-muted-foreground">{images?.length ?? 0} ไฟล์</p>
              </div>
              <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังโหลดรูปเอกสาร...
              </div>
            ) : isError ? (
              <div className="flex flex-1 items-center justify-center text-sm text-destructive">โหลดรูปเอกสารไม่สำเร็จ</div>
            ) : (images?.length ?? 0) === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Inbox className="h-10 w-10" />
                <p className="text-sm">ยังไม่มีรูปเอกสาร</p>
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden">
                <div className="w-48 shrink-0 overflow-y-auto border-r border-border p-2">
                  {categories.map((cat) => {
                    const count = categorized.get(cat)?.length ?? 0;
                    const active = cat === selectedCategory;
                    const Icon = cat === PDF_CATEGORY ? FileText : ImageIcon;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium ${
                          active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{cat}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-card/25" : "bg-secondary text-secondary-foreground"}`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {activeImages.map((img, i) => (
                      <ImageCard key={img.imageId ?? i} image={img} onClick={() => handleCardClick(img)} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {detailImage && <ImageDetailDialog image={detailImage} onClose={() => setDetailImage(null)} />}
    </>
  );
}

function ImageCard({ image, onClick }: { image: DocumentImage; onClick: () => void }) {
  const isPdf = categorize(image) === PDF_CATEGORY;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-secondary/30 text-left hover:border-primary"
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-secondary/60">
        {isPdf ? (
          <FileText className="h-10 w-10 text-muted-foreground" />
        ) : image.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.imageUrl} alt={image.description ?? "document"} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-[11px] font-medium">{image.description || image.subcategory || "ไม่มีชื่อ"}</p>
        {image.uploadedBy && <p className="truncate text-[10px] text-muted-foreground">โดย {image.uploadedBy}</p>}
      </div>
    </button>
  );
}

function ImageDetailDialog({ image, onClose }: { image: DocumentImage; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className="fixed inset-0 z-[60] flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 text-white">
            <Dialog.Title className="text-sm">{image.description ?? "รูปเอกสาร"}</Dialog.Title>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="rounded-md p-1.5 hover:bg-white/10">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="rounded-md p-1.5 hover:bg-white/10">
                <ZoomIn className="h-4 w-4" />
              </button>
              <Dialog.Close className="rounded-md p-1.5 hover:bg-white/10">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-4">
            {image.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.imageUrl}
                alt={image.description ?? "document"}
                style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease" }}
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
          {(image.uploadedBy || image.uploadedAt) && (
            <div className="border-t border-white/10 px-5 py-3 text-xs text-white/70">
              {image.uploadedBy && <span>อัปโหลดโดย {image.uploadedBy}</span>}
              {image.uploadedBy && image.uploadedAt && <span> · </span>}
              {image.uploadedAt && <span>{new Date(image.uploadedAt).toLocaleString("th-TH")}</span>}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
