import { describe, expect, it } from "vitest";
import { reconcileKpiEmployees, type ShopFetchResult } from "@/lib/kpi/kpi-reconcile";
import type { DocumentImage } from "@/types/document-image";
import type { Journal } from "@/types/journal";
import type { TaskItem } from "@/types/task";

const UPLOADER = "palmnatthakarn@gmail.com";
const KEYER = "internalsh017@gmail.com";
const RANGE_START = new Date(2026, 8, 1);
const RANGE_END = new Date(2026, 8, 30);

const task: TaskItem = {
  guidfixed: "task-1",
  code: "T1",
  name: "ขาย เดือน08.69",
  module: "GL",
  status: 6,
  parentGuidfixed: "",
  path: "",
  isFavorit: false,
  description: "",
  totalDocument: 4,
  totalDocumentStatus: [],
  ownerAt: new Date(2026, 8, 16),
  ownerBy: UPLOADER,
  billCount: 4,
  referenceCount: 0,
  referenceBalance: 0,
  rejectFromTaskGuid: "",
};

// One /documentimagegroup set = one image here; all uploaded by UPLOADER.
const image = (
  group: string,
  docNo: string,
  ocrAnalyzed: boolean,
  ocrAnalyzedAt = "2026-09-16T09:53:28Z"
): DocumentImage => ({
  imageId: `${group}-img`,
  shopId: null,
  category: null,
  subcategory: null,
  description: null,
  uploadedAt: "2026-09-16T09:29:30Z",
  uploadedBy: UPLOADER,
  imageUrl: null,
  ocrAnalyzed,
  ocrAnalyzedAt,
  groupId: group,
  groupDocNo: docNo,
});

const journal = (docno: string, documentref?: string): Journal => ({
  docno,
  documentref,
  createdby: KEYER,
  createdat: "2026-09-16T17:26:14Z",
  jobguidfixed: "task-1",
});

function shop(journals: Journal[]): ShopFetchResult {
  const images = [
    image("g-keyed-ref", "TR-6909-0339", true), // OCR'd, saved (found via documentref)
    image("g-keyed-docno", "TR-6909-0340", true), // OCR'd, saved (found via docno)
    image("g-unsaved", "TR-6909-0341", true), // OCR'd, nobody saved it yet
    image("g-no-ocr", "TR-6909-0342", false), // saved but never OCR'd
    image("g-ocr-last-month", "TR-6908-0001", true, "2026-08-20T10:00:00Z"), // AI ran outside the range
  ];
  return {
    shopName: "ร้าน A",
    tasks: [task],
    journals,
    docNoToTaskGuid: new Map(images.map((i) => [i.groupDocNo!, "task-1"])),
    taskUploaderCounts: new Map([["task-1", new Map([[UPLOADER, images.length]])]]),
    taskUploadedImages: new Map([["task-1", images]]),
    documentRefUploadedImages: new Map([["g-keyed-ref", [images[0]]]]),
    billCount: 4,
    activeDocumentCount: 4,
    complete: true,
  };
}

describe("OCR-analyzed KPI credit", () => {
  const employees = reconcileKpiEmployees(
    [shop([journal("TR-6909-0339", "g-keyed-ref"), journal("TR-6909-0340"), journal("TR-6909-0342")])],
    RANGE_START,
    RANGE_END
  );
  const byName = (name: string) => employees.find((e) => e.name === name)!;

  it("credits a saved OCR set to the person who keyed the GL journal", () => {
    expect(byName(KEYER).totalOcrAnalyzed).toBe(2);
    expect(byName(KEYER).shopStats[0].ocrAnalyzedCount).toBe(2);
    expect(byName(KEYER).shopStats[0].tasks[0].ocrAnalyzedCount).toBe(2);
  });

  it("credits an OCR set nobody has saved to its uploader, not the keyer", () => {
    expect(byName(UPLOADER).totalOcrAnalyzed).toBe(1);
    expect(byName(UPLOADER).shopStats[0].tasks[0].ocrAnalyzedCount).toBe(1);
  });

  it("gives every set to exactly one side, so the totals add up", () => {
    expect(byName(KEYER).totalOcrAnalyzed + byName(UPLOADER).totalOcrAnalyzed).toBe(3);
  });

  it("counts a set once even when several journals are keyed from it", () => {
    const keyer = reconcileKpiEmployees(
      [shop([journal("TR-6909-0339", "g-keyed-ref"), journal("TR-6909-0339", "g-keyed-ref")])],
      RANGE_START,
      RANGE_END
    ).find((e) => e.name === KEYER)!;
    expect(keyer.totalOcrAnalyzed).toBe(1);
  });

  it("only counts sets the AI analyzed inside the selected date range", () => {
    const septemberOnly = byName(KEYER).totalOcrAnalyzed + byName(UPLOADER).totalOcrAnalyzed;
    expect(septemberOnly).toBe(3);

    const august = reconcileKpiEmployees([shop([])], new Date(2026, 7, 1), new Date(2026, 7, 31));
    expect(august.find((e) => e.name === UPLOADER)?.totalOcrAnalyzed ?? 0).toBe(1);
  });
});
