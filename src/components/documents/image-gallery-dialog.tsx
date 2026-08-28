"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Inbox,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  countDocumentImageGroups,
  getDocumentImageGroupKey,
  type DocumentImage,
} from "@/types/document-image";

const PDF_CATEGORY = "ไฟล์ PDF";
const IMAGE_CATEGORY = "รูปภาพ (JPG/PNG)";

const PdfPreview = dynamic(
  () => import("@/components/documents/pdf-preview").then((module) => module.PdfPreview),
  {
    ssr: false,
    loading: () => <p className="text-sm text-white/70">กำลังเตรียมตัวแสดง PDF...</p>,
  }
);

function categorize(img: DocumentImage): string {
  const url = (img.imageUrl ?? "").toLowerCase();
  return url.endsWith(".pdf") ? PDF_CATEGORY : IMAGE_CATEGORY;
}

interface DocumentImageGroup {
  id: string;
  title: string;
  images: DocumentImage[];
  order: number;
}

function groupImages(images: DocumentImage[]): DocumentImageGroup[] {
  const groups = new Map<string, DocumentImageGroup>();
  images.forEach((image, index) => {
    const id = getDocumentImageGroupKey(image, index);
    const existing = groups.get(id);
    if (existing) {
      existing.images.push(image);
      return;
    }
    groups.set(id, {
      id,
      title:
        image.groupTitle ||
        image.groupDocNo ||
        image.description ||
        image.subcategory ||
        "ไม่มีชื่อ",
      images: [image],
      order: image.groupOrder ?? index,
    });
  });
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

/**
 * Ported from ImageGalleryDialog (image_gallery_dialog.dart) — read-only
 * categorized image/PDF viewer opened from the Dashboard's shop row. Note:
 * there is no approve/reject workflow in the Flutter source (ImageApprovalBloc
 * is provided app-wide but has zero consumers anywhere — confirmed dead
 * code), so none is added here either.
 */
export function ImageGalleryDialog({
  shopName,
  images,
  onClose,
}: {
  shopName: string;
  images: DocumentImage[];
  onClose: () => void;
}) {

  const categorized = useMemo(() => {
    const map = new Map<string, DocumentImage[]>();
    for (const img of images) {
      const cat = categorize(img);
      const list = map.get(cat) ?? [];
      list.push(img);
      map.set(cat, list);
    }
    return map;
  }, [images]);

  const categories = Array.from(categorized.keys());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailSelection, setDetailSelection] = useState<{
    images: DocumentImage[];
    initialIndex: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) setSelectedCategory(categories[0]);
  }, [categories, selectedCategory]);

  const activeImages = useMemo(
    () => (selectedCategory ? categorized.get(selectedCategory) ?? [] : []),
    [categorized, selectedCategory]
  );
  const activeGroups = useMemo(() => groupImages(activeImages), [activeImages]);
  const activeSequence = useMemo(
    () => activeGroups.flatMap((group) => group.images),
    [activeGroups]
  );
  const totalGroups = useMemo(
    () => countDocumentImageGroups(images),
    [images]
  );

  function handleCardClick(group: DocumentImageGroup) {
    const firstImage = group.images[0];
    const initialIndex = activeSequence.indexOf(firstImage);
    setDetailSelection({
      images: activeSequence,
      initialIndex: initialIndex >= 0 ? initialIndex : 0,
    });
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
                <p className="text-xs text-muted-foreground">
                  {totalGroups} ชุด • {images.length} ไฟล์
                </p>
              </div>
              <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {images.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Inbox className="h-10 w-10" />
                <p className="text-sm">ยังไม่มีรูปเอกสาร</p>
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden">
                <div className="w-48 shrink-0 overflow-y-auto border-r border-border p-2">
                  {categories.map((cat) => {
                    const count = groupImages(categorized.get(cat) ?? []).length;
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
                    {activeGroups.map((group) => (
                      <ImageGroupCard
                        key={group.id}
                        group={group}
                        onClick={() => handleCardClick(group)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {detailSelection && (
        <ImageDetailDialog
          images={detailSelection.images}
          initialIndex={detailSelection.initialIndex}
          onClose={() => setDetailSelection(null)}
        />
      )}
    </>
  );
}

function ImageGroupCard({ group, onClick }: { group: DocumentImageGroup; onClick: () => void }) {
  const image = group.images[0];
  const isPdf = categorize(image) === PDF_CATEGORY;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-secondary/30 text-left hover:border-primary"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-secondary/60">
        {isPdf ? (
          <FileText className="h-10 w-10 text-muted-foreground" />
        ) : image.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.imageUrl} alt={image.description ?? "document"} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        )}
        {group.images.length > 1 && (
          <span className="absolute right-2 top-2 rounded-md bg-black px-2 py-1 text-[10px] font-semibold text-white shadow">
            {group.images.length} เอกสาร
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-[11px] font-medium">{group.title}</p>
        {image.uploadedBy && <p className="truncate text-[10px] text-muted-foreground">โดย {image.uploadedBy}</p>}
      </div>
    </button>
  );
}

function ImageDetailDialog({
  images,
  initialIndex,
  onClose,
}: {
  images: DocumentImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const image = images[currentIndex];
  const isPdf = image ? categorize(image) === PDF_CATEGORY : false;
  const canNavigate = images.length > 1;

  const showPrevious = useCallback(() => {
    setCurrentIndex((index) => (index - 1 + images.length) % images.length);
    setZoom(1);
  }, [images.length]);

  const showNext = useCallback(() => {
    setCurrentIndex((index) => (index + 1) % images.length);
    setZoom(1);
  }, [images.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" && canNavigate) {
        event.preventDefault();
        showPrevious();
      } else if (event.key === "ArrowRight" && canNavigate) {
        event.preventDefault();
        showNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canNavigate, showNext, showPrevious]);

  if (!image) return null;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className="fixed inset-0 z-[60] flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 text-white">
            <div>
              <Dialog.Title className="text-sm">
                {image.groupTitle || image.groupDocNo || image.description || "รูปเอกสาร"}
              </Dialog.Title>
              <p className="mt-0.5 text-xs text-white/60">
                {currentIndex + 1} / {images.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="ย่อเอกสาร"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="rounded-md p-1.5 hover:bg-white/10"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="ขยายเอกสาร"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="rounded-md p-1.5 hover:bg-white/10"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <Dialog.Close className="rounded-md p-1.5 hover:bg-white/10">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-auto p-4">
            {canNavigate && (
              <button
                type="button"
                onClick={showPrevious}
                aria-label="ดูรูปก่อนหน้า"
                className="fixed left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white shadow-lg hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {image.imageUrl && isPdf ? (
              <PdfPreview
                key={image.imageId ?? image.imageUrl}
                url={image.imageUrl}
                zoom={zoom}
              />
            ) : image.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.imageUrl}
                alt={image.description ?? "document"}
                style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease" }}
                className="max-h-full max-w-full object-contain"
              />
            ) : null}
            {canNavigate && (
              <button
                type="button"
                onClick={showNext}
                aria-label="ดูรูปถัดไป"
                className="fixed right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white shadow-lg hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
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
