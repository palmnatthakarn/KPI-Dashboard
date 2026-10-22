"use client";

import { getDisplayName } from "@/lib/employee/employee-mapping-service";
import { downloadPdf } from "@/lib/kpi/kpi-pdf-export";
import type { UploaderUploads } from "@/lib/kpi/kpi-doc-search";
import { renderUploadPdf, type UploadPdfInput } from "@/lib/kpi/kpi-upload-pdf-document";
import {
  countDocumentImageGroups,
  describeImageLocation,
  getDocumentImageGroupKey,
  type DocumentImage,
} from "@/types/document-image";

// The set list is the heavy part of the PDF; past this many sets the report
// asks for a narrower filter instead of taking minutes to build.
export const MAX_SET_ROWS = 500;

export interface UploadSetRow {
  shopName: string;
  /** Set name, else its document number, else the first file name. */
  title: string;
  location: string;
  imageCount: number;
  /** Latest upload time in the set, or null when none is known. */
  uploadedAt: Date | null;
}

function latestTime(images: DocumentImage[]): Date | null {
  const times = images.flatMap((image) => {
    const time = image.uploadedAt ? new Date(image.uploadedAt).getTime() : NaN;
    return Number.isFinite(time) ? [time] : [];
  });
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}

/** One row per document set this uploader uploaded, shop by shop, newest first within a shop. */
export function uploadSetRows(row: UploaderUploads): UploadSetRow[] {
  return row.shops.flatMap((shop) => {
    const sets = new Map<string, DocumentImage[]>();
    shop.images.forEach((image, index) => {
      const key = getDocumentImageGroupKey(image, index);
      sets.set(key, [...(sets.get(key) ?? []), image]);
    });
    return [...sets.values()]
      .map((images) => {
        const first = images[0];
        return {
          shopName: shop.shopName,
          title: first.groupTitle || first.groupDocNo || first.description || "ไม่มีชื่อ",
          location: describeImageLocation(first) ?? "-",
          imageCount: images.length,
          uploadedAt: latestTime(images),
        };
      })
      .sort((a, b) => (b.uploadedAt?.getTime() ?? 0) - (a.uploadedAt?.getTime() ?? 0));
  });
}

const formatNumber = (value: number) => value.toLocaleString("en-US");
const formatTime = (value: Date | null) => (value ? value.toLocaleString("th-TH") : "-");

/**
 * Everything the PDF shows, as plain text: display names, counts and times
 * are resolved here on the main thread, and the set list is capped across the
 * whole file at `maxSetRows`.
 */
export function buildUploadPdfInput(
  uploaders: UploaderUploads[],
  options: { rangeLabel: string; userName: string; maxSetRows?: number }
): UploadPdfInput {
  const { rangeLabel, userName, maxSetRows = MAX_SET_ROWS } = options;
  const allImages = uploaders.flatMap((row) => row.shops.flatMap((shop) => shop.images));
  let budget = maxSetRows;

  return {
    rangeLabel,
    userName,
    printedDate: new Date().toLocaleDateString("th-TH"),
    summaryLine: `${formatNumber(countDocumentImageGroups(allImages))} ชุดเอกสาร · ${formatNumber(allImages.length)} รูป · จาก ${formatNumber(
      uploaders.length
    )} คน (ไม่สนว่าคีย์แล้วหรือยัง)`,
    uploaders: uploaders.map((row, index) => {
      const displayName = getDisplayName(row.uploader);
      const images = row.shops.flatMap((shop) => shop.images);
      const sets = uploadSetRows(row);
      const shown = sets.slice(0, Math.max(0, budget));
      budget -= shown.length;
      return {
        label: `${index + 1}. ${displayName === row.uploader ? row.uploader : `${displayName} (${row.uploader})`}`,
        summary: `${formatNumber(row.shops.length)} ร้าน · ${formatNumber(countDocumentImageGroups(images))} ชุดเอกสาร · ${formatNumber(
          row.imageCount
        )} รูป`,
        shopRows: row.shops.map((shop) => [
          shop.shopName,
          formatNumber(countDocumentImageGroups(shop.images)),
          formatNumber(shop.images.length),
          formatTime(latestTime(shop.images)),
        ]),
        totalRow:
          row.shops.length > 1
            ? ["รวม", formatNumber(countDocumentImageGroups(images)), formatNumber(row.imageCount), formatTime(latestTime(images))]
            : null,
        setTitle: `รายการชุดเอกสาร (${formatNumber(sets.length)} ชุด)`,
        setRows: shown.map((set) => [set.title, set.shopName, set.location, formatNumber(set.imageCount), formatTime(set.uploadedAt)]),
        setNote:
          shown.length < sets.length
            ? `แสดง ${formatNumber(shown.length)} จาก ${formatNumber(sets.length)} ชุด (จำกัดทั้งไฟล์ ${formatNumber(
                maxSetRows
              )} ชุด) — เลือกพนักงาน ร้าน หรือช่วงวันที่ให้แคบลงเพื่อดูครบ`
            : null,
      };
    }),
  };
}

/** Renders in a Web Worker; resolves null when a worker cannot be used here. */
function renderInWorker(input: UploadPdfInput, fontBaseUrl: string): Promise<Blob | null> {
  if (typeof Worker === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./kpi-upload-pdf.worker.ts", import.meta.url));
    } catch {
      resolve(null);
      return;
    }
    worker.onmessage = (event: MessageEvent<{ ok: true; blob: Blob } | { ok: false; message: string }>) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.blob);
      else reject(new Error(event.data.message));
    };
    // The worker script itself failed to load or run: fall back to the main thread.
    worker.onerror = (event) => {
      event.preventDefault();
      worker.terminate();
      resolve(null);
    };
    worker.postMessage({ input, fontBaseUrl });
  });
}

/** Downloads the upload view (uploaders by shop, plus each set's location) as a PDF. */
export async function exportKpiUploadPdf(options: { uploaders: UploaderUploads[]; rangeLabel: string; userName: string }) {
  const input = buildUploadPdfInput(options.uploaders, options);
  const fontBaseUrl = window.location.origin;
  const startedAt = performance.now();
  const blob = (await renderInWorker(input, fontBaseUrl)) ?? (await renderUploadPdf(input, fontBaseUrl));
  console.info("[kpi-upload-pdf] generation completed", {
    durationMs: Math.round(performance.now() - startedAt),
    bytes: blob.size,
  });
  downloadPdf(blob, "KPI_Uploads");
}
