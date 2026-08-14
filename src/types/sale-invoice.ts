/**
 * Ported 1:1 from lib/models/sale_invoice.dart.
 *
 * Note: SaleInvoiceBloc/SaleInvoiceService are not wired to any page or
 * BlocProvider anywhere in the Flutter app (confirmed via grep — zero call
 * sites outside lib/blocs/sale_invoice/). Only the API-layer types +
 * service function are ported here for parity; no page/UI exists to port.
 */
export interface SaleInvoice {
  id?: number;
  branch_sync?: string;
  doc_datetime?: string;
  doc_no?: string;
  period_number?: string;
  account_year?: string;
  book_code?: string;
  book_name?: string;
  customer_code?: string;
  customer_name?: string;
  customer_tax_id?: string;
  net_amount?: number;
  vat_amount?: number;
  total_amount?: number;
  discount_amount?: number;
  status?: string;
  invoice_type?: string;
  payment_status?: string;
  branch_code?: string;
  branch_name?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SaleInvoiceResponse {
  saleInvoices?: SaleInvoice[];
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
}

export interface SaleInvoiceSummary {
  branch_sync?: string;
  branch_name?: string;
  total_net_amount?: number;
  total_vat_amount?: number;
  total_amount?: number;
  total_discount_amount?: number;
  invoice_count?: number;
}

export interface GetAllSaleInvoicesParams {
  page?: number;
  limit?: number;
  branchSync?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentStatus?: string;
  customerCode?: string;
}
