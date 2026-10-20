import { describe, expect, it, vi } from "vitest";
import { collectShopUploads } from "@/lib/kpi/kpi-combined-service";
import type { ShopFetchResult } from "@/lib/kpi/kpi-reconcile";
import type { DocumentImage } from "@/types/document-image";

// See kpi-combined-service.test.ts: avoids initializing the real Firebase SDK.
vi.mock("@/lib/employee/employee-mapping-service", () => ({
  saveKnownEmployees: vi.fn(),
}));

const image = (imageId: string) => ({ imageId, uploadedBy: "anna", uploadedAt: "2026-10-05T02:00:00Z" }) as DocumentImage;

const shop = (shopName: string, taskImages: DocumentImage[], refImages: DocumentImage[]) =>
  ({
    shopName,
    tasks: [{ guidfixed: "TASK-1", name: "งาน 9.69" }],
    journals: [{ documentref: "ref-1", docno: "AQ-6910-0001" }],
    taskUploadedImages: new Map([["task-1", taskImages]]),
    documentRefUploadedImages: new Map([["ref-1", refImages]]),
  }) as unknown as ShopFetchResult;

describe("collectShopUploads", () => {
  it("lists every task and GL-referenced image once per shop, keyed or not", () => {
    const uploads = collectShopUploads([
      shop("s1", [image("1"), image("2")], [image("2"), image("3")]),
      shop("s2", [image("1")], []),
    ]);
    expect(uploads.map((u) => `${u.shopName}:${u.image.imageId}`)).toEqual(["s1:1", "s1:2", "s1:3", "s2:1"]);
  });

  it("says where each image sits: its task and keyed document number, or no task", () => {
    const keyed = { ...image("2"), groupDocNo: "AQ-6910-0002" };
    const uploads = collectShopUploads([shop("s1", [image("1"), keyed], [image("2"), image("3")])]);
    expect(uploads.map((u) => [u.image.imageId, u.image.taskName, u.image.groupDocNo])).toEqual([
      ["1", "งาน 9.69", null],
      ["2", "งาน 9.69", "AQ-6910-0002"],
      ["3", null, "AQ-6910-0001"],
    ]);
  });
});
