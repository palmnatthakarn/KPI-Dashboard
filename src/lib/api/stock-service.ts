import { apiClient } from "@/lib/api/client";
import type { GetAllStockParams, Stock, StockResponse, StockSummary } from "@/types/stock";

/** Ported from StockService (stock_service.dart) — see note in types/stock.ts. */
export async function getAllStock(params: GetAllStockParams = {}): Promise<StockResponse> {
  const { page = 1, limit = 50, branchSync, itemCode, movementType, startDate, endDate, warehouseCode } = params;

  const { data } = await apiClient.get("/stock", {
    params: {
      page,
      limit,
      ...(branchSync ? { branch_sync: branchSync } : {}),
      ...(itemCode ? { item_code: itemCode } : {}),
      ...(movementType ? { movement_type: movementType } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
      ...(warehouseCode ? { warehouse_code: warehouseCode } : {}),
    },
  });

  if (data?.success === true && data?.data) {
    return {
      stocks: (data.data as Stock[]) ?? [],
      totalCount: data.pagination?.total ?? 0,
      currentPage: data.pagination?.page ?? 1,
      totalPages: data.pagination?.pages ?? 1,
    };
  }
  return data as StockResponse;
}

export async function getStockById(id: number): Promise<Stock | null> {
  try {
    const { data } = await apiClient.get<Stock>(`/stock/${id}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}

export async function getStockSummaryByBranch(branchSync: string): Promise<StockSummary[]> {
  try {
    const { data } = await apiClient.get(`/stock/summary/${branchSync}`);
    if (Array.isArray(data)) return data as StockSummary[];
    if (data && Array.isArray(data.data)) return data.data as StockSummary[];
    return [];
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return [];
    throw err;
  }
}

export async function getStockBalance(
  itemCode: string,
  params: { branchSync?: string; warehouseCode?: string } = {}
): Promise<number> {
  const { data } = await apiClient.get(`/stock/balance/${itemCode}`, {
    params: {
      ...(params.branchSync ? { branch_sync: params.branchSync } : {}),
      ...(params.warehouseCode ? { warehouse_code: params.warehouseCode } : {}),
    },
  });
  return Number(data?.balance ?? 0);
}
