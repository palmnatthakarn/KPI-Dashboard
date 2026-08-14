/**
 * Ported 1:1 from lib/models/sale_invoice_detail.dart.
 *
 * Note: SaleInvoiceDetailBloc/SaleInvoiceDetailService are not wired to any
 * page or BlocProvider anywhere in the Flutter app (confirmed via grep —
 * zero call sites outside lib/blocs/sale_invoice_detail/). Only the
 * API-layer types + service function are ported here for parity; no
 * page/UI exists to port.
 */
export interface SaleInvoiceDetail {
  id?: number;
  invoice_id?: number;
  invoice_doc_no?: string;
  item_code?: string;
  item_name?: string;
  item_description?: string;
  unit_code?: string;
  unit_name?: string;
  quantity?: number;
  unit_price?: number;
  line_total?: number;
  discount_amount?: number;
  net_amount?: number;
  vat_rate?: number;
  vat_amount?: number;
  total_amount?: number;
  branch_sync?: string;
  branch_name?: string;
  line_no?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SaleInvoiceDetailResponse {
  saleInvoiceDetails?: SaleInvoiceDetail[];
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
}

export interface SaleInvoiceDetailSummary {
  invoice_id?: number;
  invoice_doc_no?: string;
  total_quantity?: number;
  total_line_amount?: number;
  total_discount_amount?: number;
  total_net_amount?: number;
  total_vat_amount?: number;
  total_amount?: number;
  line_count?: number;
}

export interface GetAllSaleInvoiceDetailsParams {
  page?: number;
  limit?: number;
  branchSync?: string;
  invoiceId?: number;
  itemCode?: string;
  startDate?: string;
  endDate?: string;
}
