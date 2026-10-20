"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Images, Store } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";
import { Pagination } from "@/components/common/pagination";
import { ImageGalleryDialog } from "@/components/documents/image-gallery-dialog";
import { KpiDimensions } from "@/lib/kpi/kpi-constants";
import { getDisplayName, useEmployeeMappings } from "@/lib/employee/employee-mapping-service";
import type { UploaderUploads } from "@/lib/kpi/kpi-doc-search";
import { countDocumentImageGroups, type DocumentImage } from "@/types/document-image";

// Same layout language as KpiTable: name column, numeric columns, expand column.
const GRID_TEMPLATE = `minmax(${KpiDimensions.nameColWidth}px,1.6fr) repeat(3, minmax(90px, 1fr)) minmax(150px, 1.2fr) 96px ${KpiDimensions.expandColWidth}px`;
const GRID_MIN_WIDTH = KpiDimensions.nameColWidth + 3 * 90 + 150 + 96 + KpiDimensions.expandColWidth;

/** Thicker left rule marking where a column group begins (as in KpiTable). */
const GROUP_DIVIDER = "border-l-2 border-l-border";

const GROUP_HEADERS = [
  { label: "", span: 1, tinted: false },
  { label: "การอัปโหลด", span: 4, tinted: true, groupStart: true },
  { label: "", span: 2, tinted: false },
];

const COLUMN_LABELS = ["ผู้อัปโหลด", "ชุดเอกสาร", "รูป", "ร้าน", "อัปโหลดล่าสุด", "", ""];

function latestUpload(images: DocumentImage[]): string {
  const times = images.flatMap((image) => {
    const time = image.uploadedAt ? new Date(image.uploadedAt).getTime() : NaN;
    return Number.isFinite(time) ? [time] : [];
  });
  return times.length > 0 ? new Date(Math.max(...times)).toLocaleString("th-TH") : "—";
}

function numCell(value: number | null, groupStart = false) {
  const isZero = !value;
  return (
    <div
      className={`flex h-full items-center justify-center border-l border-border text-[12px] font-semibold tabular-nums ${
        isZero ? "text-muted-foreground/60" : "text-foreground"
      } ${groupStart ? GROUP_DIVIDER : ""}`}
    >
      {isZero ? "—" : value.toLocaleString("th-TH")}
    </div>
  );
}

function textCell(text: string) {
  return (
    <div className="flex h-full items-center justify-center border-l border-border px-1.5 text-center text-[11px] tabular-nums text-muted-foreground">
      {text}
    </div>
  );
}

function ViewImagesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Images className="h-3.5 w-3.5" />
      ดูรูป
    </button>
  );
}

/** The KPI page's upload view: images uploaded in the selected upload range, by uploader and shop. */
export function KpiUploadTable({ uploaders, fontScale }: { uploaders: UploaderUploads[]; fontScale: number }) {
  useEmployeeMappings();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [gallery, setGallery] = useState<{ title: string; images: DocumentImage[] } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  function toggle(uploader: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uploader)) next.delete(uploader);
      else next.add(uploader);
      return next;
    });
  }

  const fs = (base: number) => `${base * fontScale}px`;
  const totalPages = Math.max(1, Math.ceil(uploaders.length / rowsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const pageRows = uploaders.slice((effectivePage - 1) * rowsPerPage, effectivePage * rowsPerPage);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">รายชื่อผู้อัปโหลด</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">คลิกที่รายชื่อเพื่อดูรายละเอียดร้าน</p>
        </div>
        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-info-strong">
          ทั้งหมด {uploaders.length.toLocaleString("th-TH")} คน
        </span>
      </div>

      {/* Mobile */}
      <div className="divide-y divide-border md:hidden">
        {pageRows.map((row) => {
          const displayName = getDisplayName(row.uploader);
          const isOpen = expanded.has(row.uploader);
          const allImages = row.shops.flatMap((shop) => shop.images);
          return (
            <article key={row.uploader} className="bg-card px-3 py-3">
              <button
                type="button"
                onClick={() => toggle(row.uploader)}
                aria-expanded={isOpen}
                className="w-full rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar name={displayName} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                    {displayName !== row.uploader && <p className="truncate text-[10px] text-muted-foreground">{row.uploader}</p>}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{row.shops.length} ร้าน</p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MobileMetric label="ชุดเอกสาร" value={countDocumentImageGroups(allImages).toLocaleString("th-TH")} />
                  <MobileMetric label="รูป" value={row.imageCount.toLocaleString("th-TH")} />
                </div>
              </button>

              {isOpen && (
                <div className="ml-3 mt-2 space-y-2 border-l border-border pl-3">
                  {row.shops.map((shop) => (
                    <section key={shop.shopName} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                        <Store className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">{shop.shopName}</p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          {countDocumentImageGroups(shop.images).toLocaleString("th-TH")} ชุด · {shop.images.length.toLocaleString("th-TH")} รูป · ล่าสุด {latestUpload(shop.images)}
                        </p>
                      </div>
                      <ViewImagesButton onClick={() => setGallery({ title: `${shop.shopName} · ${displayName}`, images: shop.images })} />
                    </section>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block" style={{ fontSize: fs(12) }}>
        <div className="w-full" style={{ minWidth: GRID_MIN_WIDTH }}>
          <div className="grid border-b border-border" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
            {GROUP_HEADERS.map((g, i) => (
              <div
                key={i}
                style={{ gridColumn: `span ${g.span}`, fontSize: fs(10) }}
                className={`flex h-6 items-center justify-center font-semibold uppercase tracking-wide text-muted-foreground ${
                  g.tinted ? "bg-secondary" : ""
                } ${"groupStart" in g && g.groupStart ? GROUP_DIVIDER : ""}`}
              >
                {g.label}
              </div>
            ))}
          </div>
          <div className="grid border-b border-border bg-secondary" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
            {COLUMN_LABELS.map((label, i) => (
              <div
                key={i}
                style={{ fontSize: fs(11) }}
                className={`flex min-h-10 items-center border-l border-border px-1.5 py-1 font-semibold leading-tight text-muted-foreground ${
                  i === 0 ? "justify-start border-l-0" : "justify-center text-center"
                } ${i === 1 ? GROUP_DIVIDER : ""}`}
              >
                {label}
              </div>
            ))}
          </div>

          {pageRows.map((row, idx) => {
            const displayName = getDisplayName(row.uploader);
            const isOpen = expanded.has(row.uploader);
            const allImages = row.shops.flatMap((shop) => shop.images);
            return (
              <div key={row.uploader} className={idx % 2 === 0 ? "bg-card" : "bg-secondary/40"}>
                <div
                  className="group grid cursor-pointer border-b border-border transition-colors hover:bg-accent/40"
                  style={{ gridTemplateColumns: GRID_TEMPLATE, minHeight: 64 }}
                  onClick={() => toggle(row.uploader)}
                >
                  <div className="flex items-center gap-3 border-l border-l-transparent px-3 py-2 transition-colors group-hover:border-l-indigo-400">
                    <UserAvatar name={displayName} size={KpiDimensions.avatarRadius * 2} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground" style={{ fontSize: fs(12) }}>
                        {displayName}
                      </p>
                      {displayName !== row.uploader && <p className="truncate text-[10px] text-muted-foreground">{row.uploader}</p>}
                      <p className="truncate text-[10px] text-muted-foreground">{row.shops.length} ร้าน</p>
                    </div>
                  </div>
                  {numCell(countDocumentImageGroups(allImages), true)}
                  {numCell(row.imageCount)}
                  {numCell(row.shops.length)}
                  {textCell(latestUpload(allImages))}
                  <div className="flex items-center justify-center border-l border-border">
                    <ViewImagesButton onClick={() => setGallery({ title: displayName, images: allImages })} />
                  </div>
                  <div className="flex items-center justify-center text-muted-foreground group-hover:text-info-strong">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>

                {isOpen &&
                  row.shops.map((shop) => (
                    <div
                      key={shop.shopName}
                      className="grid border-b border-border bg-card"
                      style={{ gridTemplateColumns: GRID_TEMPLATE, minHeight: 50 }}
                    >
                      <div className="flex min-w-0 items-center gap-2.5 px-3 py-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm">
                          <Store className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate font-semibold text-foreground" style={{ fontSize: fs(11.5) }}>
                          {shop.shopName}
                        </span>
                      </div>
                      {numCell(countDocumentImageGroups(shop.images), true)}
                      {numCell(shop.images.length)}
                      {numCell(null)}
                      {textCell(latestUpload(shop.images))}
                      <div className="flex items-center justify-center border-l border-border">
                        <ViewImagesButton onClick={() => setGallery({ title: `${shop.shopName} · ${displayName}`, images: shop.images })} />
                      </div>
                      <div />
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <Pagination
        currentPage={effectivePage}
        totalItems={uploaders.length}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={(rows) => {
          setRowsPerPage(rows);
          setCurrentPage(1);
        }}
      />

      {gallery && <ImageGalleryDialog shopName={gallery.title} images={gallery.images} onClose={() => setGallery(null)} />}
    </div>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl bg-secondary px-2.5 py-2">
      <span className="block text-[9px] text-muted-foreground">{label}</span>
      <span className="mt-0.5 block text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  );
}
