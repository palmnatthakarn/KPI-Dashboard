import { apiClient } from "@/lib/api/client";
import type { GetAllPurchasesParams, Purchase, PurchaseResponse, PurchaseSummary } from "@/types/purchase";

/** Ported from PurchaseService (purchase_service.dart) — see note in types/purchase.ts. */
export async function getAllPurchases(params: GetAllPurchasesParams = {}): Promise<PurchaseResponse> {
  const { page = 1, limit = 50, branchSync, startDate, endDate, status, vendorCode } = params;

  const { data } = await apiClient.get("/purchases", {
    params: {
      page,
      limit,
      ...(branchSync ? { branch_sync: branchSync } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
      ...(status ? { status } : {}),
      ...(vendorCode ? { vendor_code: vendorCode } : {}),
    },
  });

  if (data?.success === true && data?.data) {
    return {
      purchases: (data.data as Purchase[]) ?? [],
      totalCount: data.pagination?.total ?? 0,
      currentPage: data.pagination?.page ?? 1,
      totalPages: data.pagination?.pages ?? 1,
    };
  }
  return data as PurchaseResponse;
}

export async function getPurchaseById(id: number): Promise<Purchase | null> {
  try {
    const { data } = await apiClient.get<Purchase>(`/purchases/${id}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}

export async function getPurchaseSummaryByBranch(branchSync: string): Promise<PurchaseSummary | null> {
  try {
    const { data } = await apiClient.get<PurchaseSummary>(`/purchases/summary/${branchSync}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}
