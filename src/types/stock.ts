/**
 * Ported 1:1 from lib/models/stock.dart.
 *
 * Note: StockBloc/StockService are not wired to any page or BlocProvider
 * anywhere in the Flutter app (confirmed via grep — zero call sites outside
 * lib/blocs/stock/). Only the API-layer types + service function are
 * ported here for parity; no page/UI exists to port.
 */
export interface Stock {
  id?: number;
  branch_sync?: string;
  doc_datetime?: string;
  doc_no?: string;
  period_number?: string;
  account_year?: string;
  book_code?: string;
  book_name?: string;
  item_code?: string;
  item_name?: string;
  item_description?: string;
  unit_code?: string;
  unit_name?: string;
  /** IN | OUT | ADJUST | TRANSFER */
  movement_type?: string;
  quantity_in?: number;
  quantity_out?: number;
  quantity_balance?: number;
  unit_cost?: number;
  total_cost?: number;
  average_cost?: number;
  warehouse_code?: string;
  warehouse_name?: string;
  location_code?: string;
  location_name?: string;
  reference_doc_no?: string;
  reference_type?: string;
  branch_code?: string;
  branch_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockResponse {
  stocks?: Stock[];
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
}

export interface StockSummary {
  branch_sync?: string;
  branch_name?: string;
  item_code?: string;
  item_name?: string;
  total_quantity_in?: number;
  total_quantity_out?: number;
  current_balance?: number;
  total_cost_value?: number;
  average_unit_cost?: number;
  movement_count?: number;
}

export interface GetAllStockParams {
  page?: number;
  limit?: number;
  branchSync?: string;
  itemCode?: string;
  movementType?: string;
  startDate?: string;
  endDate?: string;
  warehouseCode?: string;
}
