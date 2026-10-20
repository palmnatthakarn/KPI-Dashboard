import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearKpiCombinedCache, fetchKpiCombinedData } from "@/lib/kpi/kpi-combined-service";
import { fetchTasksForShop } from "@/lib/api/task-service";

vi.mock("@/lib/api/multi-shop-service", () => ({
  listShops: vi.fn(async () => [
    { shopid: "s1", shopname: "ร้าน 1" },
    { shopid: "s2", shopname: "ร้าน 2" },
    { shopid: "s3", shopname: "ร้าน 3" },
  ]),
}));
vi.mock("@/lib/api/task-service", () => ({ fetchTasksForShop: vi.fn() }));
vi.mock("@/lib/api/journal-service", () => ({
  getAllGLJournals: vi.fn(async () => ({ success: true, data: [], pagination: { total: 0, page: 1, perPage: 1000, totalPage: 1 } })),
}));
vi.mock("@/lib/api/document-image-service", () => ({
  fetchDocNoToTaskGuidMap: vi.fn(),
  fetchDocumentImageGroupImages: vi.fn(async () => []),
  fetchShopActiveDocumentCount: vi.fn(async () => 0),
  fetchShopBillCount: vi.fn(async () => 0),
}));
// See kpi-combined-service.test.ts: avoids initializing the real Firebase SDK.
vi.mock("@/lib/employee/employee-mapping-service", () => ({ saveKnownEmployees: vi.fn(async () => undefined) }));

const range = { shopIds: [], shopNames: [], startDate: new Date(2026, 9, 1), endDate: new Date(2026, 9, 31) };

describe("fetchKpiCombinedData cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKpiCombinedCache();
  });

  it("finishes the shop in progress, then stops before the next one", async () => {
    const controller = new AbortController();
    vi.mocked(fetchTasksForShop).mockImplementation(async () => {
      controller.abort(); // a new search arrives while shop 1 is loading
      return { tasks: [] } as never;
    });

    await expect(fetchKpiCombinedData({ ...range, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchTasksForShop).toHaveBeenCalledTimes(1);
  });

  it("does not hand an aborted fetch to a later search for the same range", async () => {
    const controller = new AbortController();
    vi.mocked(fetchTasksForShop).mockImplementationOnce(async () => {
      controller.abort();
      return { tasks: [] } as never;
    });
    vi.mocked(fetchTasksForShop).mockResolvedValue({ tasks: [] } as never);

    const aborted = fetchKpiCombinedData({ ...range, signal: controller.signal });
    await expect(aborted).rejects.toMatchObject({ name: "AbortError" });

    const result = await fetchKpiCombinedData(range);
    expect(result.employees).toEqual([]);
    expect(fetchTasksForShop).toHaveBeenCalledTimes(4); // 1 aborted + 3 fresh
  });
});
