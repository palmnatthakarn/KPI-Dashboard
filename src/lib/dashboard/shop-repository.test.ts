import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchMultiShopSummary: vi.fn(),
  getCurrentYearDateRange: vi.fn(() => ({
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  })),
  getToken: vi.fn(),
  listShops: vi.fn(),
}));

vi.mock("@/lib/auth/token-storage", () => ({
  getToken: mocks.getToken,
}));

vi.mock("@/lib/api/multi-shop-service", () => ({
  fetchMultiShopSummary: mocks.fetchMultiShopSummary,
  getCurrentYearDateRange: mocks.getCurrentYearDateRange,
  listShops: mocks.listShops,
}));

import { fetchShopsSummary } from "./shop-repository";

describe("fetchShopsSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getToken.mockReturnValue("token");
    mocks.listShops.mockResolvedValue([]);
  });

  it("rejects when the session token is missing", async () => {
    mocks.getToken.mockReturnValue(null);

    await expect(fetchShopsSummary()).rejects.toThrow(
      "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
    );
    expect(mocks.listShops).not.toHaveBeenCalled();
  });

  it("surfaces an API failure instead of returning fallback data", async () => {
    mocks.fetchMultiShopSummary.mockResolvedValue({
      success: false,
      message: "API unavailable",
      shops: [],
    });

    await expect(fetchShopsSummary()).rejects.toThrow("API unavailable");
  });

  it("returns an empty list when the API succeeds with no shops", async () => {
    mocks.fetchMultiShopSummary.mockResolvedValue({
      success: true,
      shops: [],
    });

    await expect(fetchShopsSummary()).resolves.toEqual([]);
  });
});
