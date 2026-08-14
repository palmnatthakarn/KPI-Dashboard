import { apiClient } from "@/lib/api/client";
import type { GetAllPaymentsParams, Payment, PaymentResponse, PaymentSummary } from "@/types/payment";

/** Ported from PaymentService (payment_service.dart) — see note in types/payment.ts. */
export async function getAllPayments(params: GetAllPaymentsParams = {}): Promise<PaymentResponse> {
  const { page = 1, limit = 50, branchSync, startDate, endDate, status, paymentMethod, vendorCode } = params;

  const { data } = await apiClient.get("/payments", {
    params: {
      page,
      limit,
      ...(branchSync ? { branch_sync: branchSync } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
      ...(status ? { status } : {}),
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
      ...(vendorCode ? { vendor_code: vendorCode } : {}),
    },
  });

  if (data?.success === true && data?.data) {
    return {
      payments: (data.data as Payment[]) ?? [],
      totalCount: data.pagination?.total ?? 0,
      currentPage: data.pagination?.page ?? 1,
      totalPages: data.pagination?.pages ?? 1,
    };
  }
  return data as PaymentResponse;
}

export async function getPaymentById(id: number): Promise<Payment | null> {
  try {
    const { data } = await apiClient.get<Payment>(`/payments/${id}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}

export async function getPaymentSummaryByBranch(branchSync: string): Promise<PaymentSummary | null> {
  try {
    const { data } = await apiClient.get<PaymentSummary>(`/payments/summary/${branchSync}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}
