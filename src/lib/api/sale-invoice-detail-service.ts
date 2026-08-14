import { apiClient } from "@/lib/api/client";
import type {
  GetAllSaleInvoiceDetailsParams,
  SaleInvoiceDetail,
  SaleInvoiceDetailResponse,
  SaleInvoiceDetailSummary,
} from "@/types/sale-invoice-detail";

/** Ported from SaleInvoiceDetailService (sale_invoice_detail_service.dart) — see note in types/sale-invoice-detail.ts. */
export async function getAllSaleInvoiceDetails(
  params: GetAllSaleInvoiceDetailsParams = {}
): Promise<SaleInvoiceDetailResponse> {
  const { page = 1, limit = 50, branchSync, invoiceId, itemCode, startDate, endDate } = params;

  const { data } = await apiClient.get("/sale-invoice-details", {
    params: {
      page,
      limit,
      ...(branchSync ? { branch_sync: branchSync } : {}),
      ...(invoiceId != null ? { invoice_id: invoiceId } : {}),
      ...(itemCode ? { item_code: itemCode } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    },
  });

  if (data?.success === true && data?.data) {
    return {
      saleInvoiceDetails: (data.data as SaleInvoiceDetail[]) ?? [],
      totalCount: data.pagination?.total ?? 0,
      currentPage: data.pagination?.page ?? 1,
      totalPages: data.pagination?.pages ?? 1,
    };
  }
  return data as SaleInvoiceDetailResponse;
}

export async function getSaleInvoiceDetailById(id: number): Promise<SaleInvoiceDetail | null> {
  try {
    const { data } = await apiClient.get<SaleInvoiceDetail>(`/sale-invoice-details/${id}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}

/** Ported from getSummaryByInvoiceId / getSaleInvoiceDetailSummaryByBranch (same endpoint shape, different key). */
export async function getSaleInvoiceDetailSummary(key: string | number): Promise<SaleInvoiceDetailSummary | null> {
  try {
    const { data } = await apiClient.get<SaleInvoiceDetailSummary>(`/sale-invoice-details/summary/${key}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}
