import { apiClient } from "@/lib/api/client";
import { getToken } from "@/lib/auth/token-storage";

/**
 * Ported from lib/services/multi_shop_service.dart.
 */

export interface ShopSummary {
  shopCode: string;
  shopName: string;
  totalDebit: number;
  totalCredit: number;
  netAmount: number;
  transactionCount: number;
  lastTransactionDate?: string;
  dailyAverage?: number;
  monthlyAverage?: number;
  yearlyAverage?: number;
  imageCount?: number;
}

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toInt(value: unknown): number {
  return Math.trunc(toNumber(value));
}

function parseShopSummary(json: any): ShopSummary {
  return {
    shopCode: String(json.shopid ?? json.shop_code ?? json.shopCode ?? ""),
    shopName: String(json.shopname ?? json.shop_name ?? json.shopName ?? "ไม่ระบุชื่อ"),
    totalDebit: toNumber(json.total_debit ?? json.totalDebit),
    totalCredit: toNumber(json.total_credit ?? json.totalCredit),
    netAmount: toNumber(json.net_amount ?? json.netAmount),
    transactionCount: toInt(json.transaction_count ?? json.transactionCount),
    lastTransactionDate: json.last_transaction_date ?? json.lastTransactionDate,
    dailyAverage: toNumber(json.dailyaverage ?? json.daily_average),
    monthlyAverage: toNumber(json.monthlyaverage ?? json.monthly_average),
    yearlyAverage: toNumber(json.yearlyaverage ?? json.yearly_average),
    imageCount: toInt(json.imagecount ?? json.image_count),
  };
}

export interface MultiShopSummaryResponse {
  success: boolean;
  message?: string;
  shops: ShopSummary[];
}

function parseMultiShopSummaryResponse(json: any): MultiShopSummaryResponse {
  const data = json?.data;
  let shops: ShopSummary[] = [];
  if (Array.isArray(data)) {
    shops = data.map(parseShopSummary);
  } else if (data && typeof data === "object") {
    const shopsList = data.shops ?? data.items ?? [];
    if (Array.isArray(shopsList)) shops = shopsList.map(parseShopSummary);
  }
  return { success: json?.success === true, message: json?.message, shops };
}

// Track whether a shop has been selected in this session (module-level, mirrors the Dart static state).
let shopSelected = false;
let availableShops: Record<string, unknown>[] = [];

/** GET /list-shop?limit=9999 — list of shops with names[] */
export async function listShops(): Promise<Record<string, unknown>[]> {
  const token = getToken();
  if (!token) return [];

  try {
    const { data } = await apiClient.get("/list-shop", { params: { limit: 9999 } });
    if (data?.success === true && Array.isArray(data.data)) {
      availableShops = data.data;
      return availableShops;
    }
    return [];
  } catch {
    return [];
  }
}

/** POST /select-shop — must be called before multi-shop-summary. */
export async function selectShop(shopId?: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  let selectedShopId = shopId;
  if (!selectedShopId) {
    if (availableShops.length === 0) await listShops();
    const first = availableShops[0] as Record<string, unknown> | undefined;
    selectedShopId = (first?.shopid ?? first?.shop_id ?? first?.id)?.toString();
  }
  if (!selectedShopId) return false;

  try {
    const { data } = await apiClient.post("/select-shop", { shopid: selectedShopId });
    if (data?.success === true) {
      shopSelected = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** GET /gl/dashboard/multi-shop-summary?startdate=&enddate= */
export async function fetchMultiShopSummary(
  startDate: string,
  endDate: string,
  isRetry = false
): Promise<MultiShopSummaryResponse> {
  const token = getToken();
  if (!token) throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");

  if (!shopSelected) {
    const ok = await selectShop();
    if (!ok) {
      // continue anyway, matches Flutter behavior
    }
  }

  const { data } = await apiClient.get("/gl/dashboard/multi-shop-summary", {
    params: { startdate: startDate, enddate: endDate },
  });

  if (data?.success === false && String(data?.message ?? "").includes("Shop not selected")) {
    shopSelected = false;
    if (!isRetry) {
      await selectShop();
      return fetchMultiShopSummary(startDate, endDate, true);
    }
  }

  return parseMultiShopSummaryResponse(data);
}

/** Call on logout. */
export function resetShopSelection() {
  shopSelected = false;
  availableShops = [];
}

export function getCurrentYearDateRange(): { startDate: string; endDate: string } {
  const year = new Date().getFullYear();
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
}

export function getCurrentMonthDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startDate: fmt(start), endDate: fmt(end) };
}
