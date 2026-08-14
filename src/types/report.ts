export interface ReportTableData {
  headers: string[];
  rows: string[][];
  /** Row indexes (0-based) rendered bold with a highlighted background — usually the total row. */
  highlightRows?: number[];
}
