export interface ReportTableData {
  headers: string[];
  rows: string[][];
  /** Row indexes (0-based) rendered bold with a highlighted background — usually the total row. */
  highlightRows?: number[];
}

export interface ReportQuery {
  reportType: string;
  shopId: string;
  startDate: string;
  endDate: string;
}
