import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/client";
import { fetchDocNoToTaskGuidMap } from "@/lib/api/document-image-service";
import { countOcrAnalyzedGroups } from "@/types/document-image";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));
vi.mock("@/lib/api/multi-shop-service", () => ({ selectShop: vi.fn() }));

const group = (guidfixed: string, ocranalyzeai: unknown, imageCount = 1) => ({
  guidfixed,
  taskguid: "task-1",
  ...(ocranalyzeai === undefined ? {} : { ocranalyzeai }),
  imagereferences: Array.from({ length: imageCount }, (_, i) => ({
    documentimageguid: `${guidfixed}-img-${i}`,
    uploadedby: "keyer",
  })),
});

describe("ocranalyzeai on /documentimagegroup", () => {
  it("counts a group 1 when ocranalyzeai has a value, 0 when empty or missing", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          group("g1", { total: 100 }, 3),
          group("g2", "result"),
          group("g3", ""),
          group("g4", null),
          group("g5", {}),
          group("g6", undefined),
        ],
        pagination: { total: 6, page: 1, perPage: 1000, totalPage: 1 },
      },
    });

    const { taskUploadedImages } = await fetchDocNoToTaskGuidMap({ perPage: 1000, taskGuid: "task-1" });
    expect(countOcrAnalyzedGroups(taskUploadedImages.get("task-1") ?? [])).toBe(2);
  });
});
