import { apiClient } from "@/lib/api/client";
import type { GetAllSaleInvoicesParams, SaleInvoice, SaleInvoiceResponse, SaleInvoiceSummary } from "@/types/sale-invoice";

/** Ported from SaleInvoiceService (sale_invoice_service.dart) — see note in types/sale-invoice.ts. */
export async function getAllSaleInvoices(params: GetAllSaleInvoicesParams = {}): Promise<SaleInvoiceResponse> {
  const { page = 1, limit = 50, branchSync, startDate, endDate, status, paymentStatus, customerCode } = params;

  const { data } = await apiClient.get("/sale-invoices", {
    params: {
      page,
      limit,
      ...(branchSync ? { branch_sync: branchSync } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
      ...(status ? { status } : {}),
      ...(paymentStatus ? { payment_status: paymentStatus } : {}),
      ...(customerCode ? { customer_code: customerCode } : {}),
    },
  });

  if (data?.success === true && data?.data) {
    return {
      saleInvoices: (data.data as SaleInvoice[]) ?? [],
      totalCount: data.pagination?.total ?? 0,
      currentPage: data.pagination?.page ?? 1,
      totalPages: data.pagination?.pages ?? 1,
    };
  }
  return data as SaleInvoiceResponse;
}

export async function getSaleInvoiceById(id: number): Promise<SaleInvoice | null> {
  try {
    const { data } = await apiClient.get<SaleInvoice>(`/sale-invoices/${id}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}

export async function getSaleInvoiceSummaryByBranch(branchSync: string): Promise<SaleInvoiceSummary | null> {
  try {
    const { data } = await apiClient.get<SaleInvoiceSummary>(`/sale-invoices/summary/${branchSync}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}

/** Ported from getOverdueInvoices — a thin filter over getAllSaleInvoices. */
export function getOverdueInvoices(params: Omit<GetAllSaleInvoicesParams, "paymentStatus"> = {}) {
  return getAllSaleInvoices({ ...params, paymentStatus: "overdue" });
}
