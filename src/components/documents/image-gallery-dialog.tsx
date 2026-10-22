"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Inbox,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  countDocumentImageGroups,
  describeImageLocation,
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

/** Case-insensitive match of the search text against a set's name, document number, file names and task. */
function groupMatchesSearch(group: DocumentImageGroup, query: string): boolean {
  if (!query) return true;
  return [
    group.title,
    ...group.images.flatMap((image) => [image.groupTitle, image.groupDocNo, image.description, image.taskName]),
  ].some(
    (text) => (text ?? "").toLowerCase().includes(query)
  );
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
  const [search, setSearch] = useState("");
  // The search box stays an icon until asked for; closing it clears the filter.
  const [searchOpen, setSearchOpen] = useState(false);
  const query = search.trim().toLowerCase();
  const [detailSelection, setDetailSelection] = useState<{
    groups: DocumentImageGroup[];
    initialIndex: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) setSelectedCategory(categories[0]);
  }, [categories, selectedCategory]);

  const activeImages = useMemo(
    () => (selectedCategory ? categorized.get(selectedCategory) ?? [] : []),
    [categorized, selectedCategory]
  );
  const activeGroups = useMemo(
    () => groupImages(activeImages).filter((group) => groupMatchesSearch(group, query)),
    [activeImages, query]
  );
  const totalGroups = useMemo(
    () => countDocumentImageGroups(images),
    [images]
  );

  function handleCardClick(group: DocumentImageGroup) {
    const initialIndex = activeGroups.indexOf(group);
    setDetailSelection({
      groups: activeGroups,
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
                  {query && ` • พบ ${activeGroups.length} ชุด`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {images.length > 0 && !searchOpen && (
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    aria-label="ค้นหาในรูปเอกสาร"
                    title="ค้นหาเลขที่เอกสาร / ชื่อรูป"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                )}
                {images.length > 0 && searchOpen && (
                  <div className="flex h-8 w-56 items-center gap-1.5 rounded-lg border border-border bg-card px-2 transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                    <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      type="search"
                      autoFocus
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="ค้นหาเลขที่เอกสาร / ชื่อรูป"
                      aria-label="ค้นหาเลขที่เอกสารหรือชื่อรูป"
                      className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setSearchOpen(false);
                      }}
                      aria-label="ปิดการค้นหา"
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
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
                    const count = groupImages(categorized.get(cat) ?? []).filter((group) =>
                      groupMatchesSearch(group, query)
                    ).length;
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
                  {activeGroups.length === 0 && query && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Search className="h-8 w-8" />
                      <p className="text-sm">ไม่พบเอกสารที่ตรงกับ &quot;{search.trim()}&quot;</p>
                    </div>
                  )}
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
          groups={detailSelection.groups}
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
        {describeImageLocation(image) && (
          <p className="break-words text-[10px] font-medium leading-snug text-info-strong">
            {describeImageLocation(image)}
          </p>
        )}
        {image.uploadedBy && <p className="truncate text-[10px] text-muted-foreground">โดย {image.uploadedBy}</p>}
      </div>
    </button>
  );
}

function uploadCaption(image: DocumentImage): string {
  return [
    image.uploadedBy ? `อัปโหลดโดย ${image.uploadedBy}` : null,
    image.uploadedAt ? new Date(image.uploadedAt).toLocaleString("th-TH") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Full-screen viewer that steps set by set. A set with several images shows
 * them stacked vertically in order, so a multi-page document reads top to
 * bottom; a single image is fitted to the screen.
 */
function ImageDetailDialog({
  groups,
  initialIndex,
  onClose,
}: {
  groups: DocumentImageGroup[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const group = groups[currentIndex];
  const canNavigate = groups.length > 1;

  const showPrevious = useCallback(() => {
    setCurrentIndex((index) => (index - 1 + groups.length) % groups.length);
    setZoom(1);
  }, [groups.length]);

  const showNext = useCallback(() => {
    setCurrentIndex((index) => (index + 1) % groups.length);
    setZoom(1);
  }, [groups.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [currentIndex]);

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

  if (!group) return null;
  const stacked = group.images.length > 1;
  const first = group.images[0];
  const location = describeImageLocation(first);
  const footer = [stacked ? "" : uploadCaption(first), location].filter(Boolean).join(" · ");

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className="fixed inset-0 z-[60] flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 text-white">
            <div>
              <Dialog.Title className="text-sm">{group.title}</Dialog.Title>
              <p className="mt-0.5 text-xs text-white/60">
                ชุดที่ {currentIndex + 1} / {groups.length}
                {stacked && ` · ${group.images.length} รูป`}
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
          {canNavigate && (
            <button
              type="button"
              onClick={showPrevious}
              aria-label="ดูชุดก่อนหน้า"
              className="fixed left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white shadow-lg hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {stacked ? (
            <div ref={scrollRef} className="flex-1 overflow-auto px-16 py-4">
              <div className="mx-auto flex flex-col items-center gap-6">
                {group.images.map((image, index) => (
                  <figure key={image.imageId ?? image.imageUrl ?? index} className="flex w-full flex-col items-center gap-2">
                    {image.imageUrl && categorize(image) === PDF_CATEGORY ? (
                      <PdfPreview url={image.imageUrl} zoom={zoom} />
                    ) : image.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.imageUrl}
                        alt={image.description ?? "document"}
                        style={{ width: `min(${820 * zoom}px, ${100 * zoom}%)` }}
                        className="max-w-none rounded-md bg-white shadow-lg"
                      />
                    ) : null}
                    <figcaption className="text-xs text-white/70">
                      หน้า {index + 1} / {group.images.length}
                      {uploadCaption(image) && ` · ${uploadCaption(image)}`}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative flex flex-1 items-center justify-center overflow-auto p-4">
              {first.imageUrl && categorize(first) === PDF_CATEGORY ? (
                <PdfPreview key={first.imageId ?? first.imageUrl} url={first.imageUrl} zoom={zoom} />
              ) : first.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={first.imageUrl}
                  alt={first.description ?? "document"}
                  style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease" }}
                  className="max-h-full max-w-full object-contain"
                />
              ) : null}
            </div>
          )}
          {canNavigate && (
            <button
              type="button"
              onClick={showNext}
              aria-label="ดูชุดถัดไป"
              className="fixed right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white shadow-lg hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          {footer && <div className="border-t border-white/10 px-5 py-3 text-xs text-white/70">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
