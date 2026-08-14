/**
 * Ported 1:1 from lib/models/payment.dart.
 *
 * Note: PaymentBloc/PaymentService are not wired to any page or BlocProvider
 * anywhere in the Flutter app (confirmed via grep — zero call sites outside
 * lib/blocs/payment/). Only the API-layer types + service function are
 * ported here for parity; no page/UI exists to port.
 */
export interface Payment {
  id?: number;
  branch_sync?: string;
  doc_datetime?: string;
  doc_no?: string;
  period_number?: string;
  account_year?: string;
  book_code?: string;
  book_name?: string;
  vendor_code?: string;
  vendor_name?: string;
  payment_method?: string;
  payment_type?: string;
  reference_no?: string;
  payment_amount?: number;
  discount_amount?: number;
  net_amount?: number;
  status?: string;
  branch_code?: string;
  branch_name?: string;
  account_code?: string;
  account_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentResponse {
  payments?: Payment[];
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
}

export interface PaymentSummary {
  branch_sync?: string;
  branch_name?: string;
  total_payment_amount?: number;
  total_discount_amount?: number;
  total_net_amount?: number;
  transaction_count?: number;
}

export interface GetAllPaymentsParams {
  page?: number;
  limit?: number;
  branchSync?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentMethod?: string;
  vendorCode?: string;
}
