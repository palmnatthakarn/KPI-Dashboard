// @vitest-environment node
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { UploaderUploads } from "@/lib/kpi/kpi-doc-search";
import type { DocumentImage } from "@/types/document-image";

vi.mock("@/lib/employee/employee-mapping-service", () => ({ getDisplayName: (name: string) => name }));
vi.mock("@/lib/kpi/kpi-pdf-export", () => ({ downloadPdf: vi.fn() }));

import { buildUploadPdfInput, uploadSetRows } from "@/lib/kpi/kpi-upload-pdf-export";
import { paginateUploadPdf, renderUploadPdf } from "@/lib/kpi/kpi-upload-pdf-document";

// The app serves the font over HTTP; here it is read straight from disk.
const FONT_BASE = path.join(process.cwd(), "public");

const image = (imageId: string, groupId: string, uploadedAt: string, extra: Partial<DocumentImage> = {}) =>
  ({ imageId, groupId, uploadedAt, uploadedBy: "anna", description: `${imageId}.jpg`, ...extra }) as DocumentImage;

const anna: UploaderUploads = {
  uploader: "anna",
  imageCount: 4,
  shops: [
    {
      shopName: "ร้าน A",
      images: [
        image("1", "g1", "2026-10-05T02:00:00Z", { groupTitle: "001", groupDocNo: "AQ-6910-0001", taskName: "9.69" }),
        image("2", "g1", "2026-10-05T03:00:00Z", { groupTitle: "001", groupDocNo: "AQ-6910-0001", taskName: "9.69" }),
        image("3", "g2", "2026-10-13T09:59:58Z", { taskName: null, groupDocNo: "AQ-6910-0002" }),
      ],
    },
    { shopName: "ร้าน B", images: [image("4", "g3", "2026-10-07T01:00:00Z", { taskName: "B" })] },
  ],
};

/** An uploader with `sets` single-image sets carrying long, space-free file names. */
function bulk(name: string, sets: number): UploaderUploads {
  const images = Array.from({ length: sets }, (_, i) =>
    image(`${name}-${i}`, `${name}-g${i}`, new Date(2026, 9, 1 + (i % 28), 9).toISOString(), {
      uploadedBy: name,
      description: `20261006_${i.toString(16).padStart(8, "0")}5178ce35d88f7a1b2c3d4e5f60718293.jpg`,
      taskName: i % 3 ? "B-20261006-154847" : null,
      groupDocNo: i % 2 ? `AQ-6910-${String(i).padStart(4, "0")}` : null,
    })
  );
  return { uploader: name, imageCount: images.length, shops: [{ shopName: "บริษัท เอนี่แวร์ ซอฟต์ จำกัด", images }] };
}

const options = { rangeLabel: "รูปที่อัปโหลด 01/10/2026 – 31/10/2026", userName: "tester" };

describe("uploadSetRows", () => {
  it("gives one row per set with its location, image count and latest upload, newest first per shop", () => {
    expect(uploadSetRows(anna)).toEqual([
      { shopName: "ร้าน A", title: "AQ-6910-0002", location: "ไม่ผ่านงาน · เลขที่ AQ-6910-0002", imageCount: 1, uploadedAt: new Date("2026-10-13T09:59:58Z") },
      { shopName: "ร้าน A", title: "001", location: "งาน 9.69 · เลขที่ AQ-6910-0001", imageCount: 2, uploadedAt: new Date("2026-10-05T03:00:00Z") },
      { shopName: "ร้าน B", title: "4.jpg", location: "งาน B · ยังไม่คีย์", imageCount: 1, uploadedAt: new Date("2026-10-07T01:00:00Z") },
    ]);
  });
});

describe("buildUploadPdfInput", () => {
  it("caps the set list across the whole file and says how many were left out", () => {
    const input = buildUploadPdfInput([bulk("a", 3), bulk("b", 4)], { ...options, maxSetRows: 5 });

    expect(input.uploaders.map((u) => u.setRows.length)).toEqual([3, 2]);
    expect(input.uploaders[0].setNote).toBeNull();
    expect(input.uploaders[1].setNote).toMatch(/^แสดง 2 จาก 4 ชุด/);
    // Shop summaries are never capped.
    expect(input.uploaders[1].shopRows[0][2]).toBe("4");
  });
});

describe("paginateUploadPdf", () => {
  it("places every row exactly once, repeating the heading and column header on continued pages", () => {
    const input = buildUploadPdfInput([bulk("a", 120), bulk("b", 40)], options);
    const pages = paginateUploadPdf(input);
    const rows = pages.flat().filter((block) => block.kind === "row" && !block.header);

    expect(pages.length).toBeGreaterThan(3);
    expect(pages.every((page) => page.length > 0)).toBe(true);
    // 2 shop rows + 160 set rows, none dropped or duplicated.
    expect(rows).toHaveLength(162);
    for (const page of pages.slice(1)) {
      expect(page[0]).toMatchObject({ kind: "heading" });
      expect(page.slice(0, 3).some((block) => block.kind === "row" && block.header)).toBe(true);
    }
    expect(pages.flat().some((block) => block.kind === "heading" && block.continued)).toBe(true);
  });
});

describe("renderUploadPdf", () => {
  it("renders a real PDF", async () => {
    const blob = await renderUploadPdf(buildUploadPdfInput([anna], options), FONT_BASE);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  }, 60_000);

  it("renders the full 500-set cap in seconds, not minutes", async () => {
    const input = buildUploadPdfInput([bulk("a", 300), bulk("b", 300)], options);
    const startedAt = performance.now();
    await renderUploadPdf(input, FONT_BASE);
    const seconds = (performance.now() - startedAt) / 1000;
    console.info(`[upload-pdf] 500 set rows rendered in ${seconds.toFixed(1)} s`);
    // Before pre-pagination this took well over a minute.
    expect(seconds).toBeLessThan(40);
  }, 120_000);
});
