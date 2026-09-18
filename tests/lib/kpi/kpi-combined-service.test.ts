import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllGLJournalsForShop } from "@/lib/kpi/kpi-combined-service";
import { getAllGLJournals } from "@/lib/api/journal-service";
import type { Journal, JournalResponse } from "@/types/journal";

vi.mock("@/lib/api/journal-service", () => ({
  getAllGLJournals: vi.fn(),
}));

// kpi-combined-service.ts imports saveKnownEmployees from here, which
// transitively initializes the real Firebase SDK at module load time —
// mock it out so this test doesn't need live Firebase config.
vi.mock("@/lib/employee/employee-mapping-service", () => ({
  saveKnownEmployees: vi.fn(),
}));

function makeJournal(docno: string): Journal {
  return { docno, createdby: "someone", createdat: "2026-09-18T00:00:00Z" };
}

describe("fetchAllGLJournalsForShop pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues to page 2 when GET /gl/journal reports totalPage (the real camelCase field, not total_pages)", async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => makeJournal(`page1-${i}`));
    const page2 = [makeJournal("page2-only-entry")];

    vi.mocked(getAllGLJournals).mockImplementation(
      async ({ page }): Promise<JournalResponse> => {
        if (page === 1) {
          return { success: true, data: page1, pagination: { total: 1001, page: 1, perPage: 1000, totalPage: 2 } };
        }
        return { success: true, data: page2, pagination: { total: 1001, page: 2, perPage: 1000, totalPage: 2 } };
      }
    );

    const { journals, complete } = await fetchAllGLJournalsForShop("shop-1", "2026-09-01", "2026-09-30");

    expect(complete).toBe(true);
    expect(journals).toHaveLength(1001);
    expect(journals.some((j) => j.docno === "page2-only-entry")).toBe(true);
    expect(getAllGLJournals).toHaveBeenCalledTimes(2);
  });

  it("stops after one page when the response is under the page limit", async () => {
    const page1 = [makeJournal("only-entry")];
    vi.mocked(getAllGLJournals).mockResolvedValue({
      success: true,
      data: page1,
      pagination: { total: 1, page: 1, perPage: 1000, totalPage: 1 },
    });

    const { journals } = await fetchAllGLJournalsForShop("shop-1", "2026-09-01", "2026-09-30");

    expect(journals).toHaveLength(1);
    expect(getAllGLJournals).toHaveBeenCalledTimes(1);
  });
});
