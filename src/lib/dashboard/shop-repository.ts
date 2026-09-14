import { getToken } from "@/lib/auth/token-storage";
import {
  listShops,
  fetchMultiShopSummary,
  getCurrentYearDateRange,
} from "@/lib/api/multi-shop-service";
import type { DocDetails, ShopName } from "@/types/shop";

/**
 * Ported from lib/repositories/shop_repository.dart — the single entry point
 * the Dashboard page talks to. Never call multi-shop-service / dashboard-service
 * directly from a component.
 */
export async function fetchShopsSummary(
  startDate?: string,
  endDate?: string
): Promise<DocDetails[]> {
  if (!getToken()) {
    throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }

  try {
    const shopList = await listShops();
    const shopNamesMap = buildNamesMap(shopList);

    const range =
      startDate && endDate
        ? { startDate, endDate }
        : getCurrentYearDateRange();
    const response = await fetchMultiShopSummary(
      range.startDate,
      range.endDate
    );

    if (!response.success) {
      throw new Error(response.message || "ไม่สามารถโหลดข้อมูล Dashboard ได้");
    }

    return response.shops.map(
      (shop): DocDetails => ({
        shopid: shop.shopCode,
        shopname: shop.shopName,
        names: shopNamesMap[shop.shopCode],
        daily: [],
        monthly_summary: {
          total: { deposit: shop.totalCredit, withdraw: shop.totalDebit },
        },
        responsible: { name: "ระบบ", role: "system" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        timezone: "Asia/Bangkok",
        daily_images: [],
        daily_transactions: [],
        dailyAverage: shop.dailyAverage,
        monthlyAverage: shop.monthlyAverage,
        yearlyAverage: shop.yearlyAverage,
        localImageCount: shop.imageCount,
      })
    );
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("ไม่สามารถโหลดข้อมูล Dashboard ได้");
  }
}

function buildNamesMap(
  shopList: Record<string, any>[]
): Record<string, ShopName[]> {
  const map: Record<string, ShopName[]> = {};
  for (const shop of shopList) {
    const shopId = (shop.shopid ?? shop.shop_id ?? shop.id)?.toString();
    if (shopId && Array.isArray(shop.names)) {
      map[shopId] = shop.names;
    }
  }
  return map;
}
