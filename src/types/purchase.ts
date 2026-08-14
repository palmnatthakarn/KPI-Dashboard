/**
 * Ported 1:1 from lib/models/purchase.dart, purchase_detail.dart.
 *
 * Note: PurchaseBloc/PurchaseService are not wired to any page or
 * BlocProvider anywhere in the Flutter app (confirmed via grep — zero call
 * sites outside lib/blocs/purchase/). Only the API-layer types + service
 * function are ported here for parity; no page/UI exists to port.
 */
export interface Purchase {
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
  purchase_amount?: number;
  vat_amount?: number;
  total_amount?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseDetail {
  id?: number;
  purchase_id?: number;
  branch_sync?: string;
  doc_no?: string;
  item_code?: string;
  item_name?: string;
  item_description?: string;
  quantity?: number;
  unit_price?: number;
  discount_amount?: number;
  line_total?: number;
  vat_rate?: number;
  vat_amount?: number;
  unit_code?: string;
  unit_name?: string;
  created_at?: string;
}

export interface PurchaseResponse {
  purchases?: Purchase[];
  totalCount?: number;
  currentPage?: number;
  perPage?: number;
  totalPages?: number;
}

export interface PurchaseSummary {
  total_amount?: number;
  total_vat?: number;
  total_transactions?: number;
  branch_sync?: string;
}

export interface GetAllPurchasesParams {
  page?: number;
  limit?: number;
  branchSync?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  vendorCode?: string;
}
