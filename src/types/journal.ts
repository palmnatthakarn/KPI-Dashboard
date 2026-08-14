/**
 * Ported 1:1 from lib/models/journal.dart (fields we actually consume).
 * `account_type` is one of ASSETS | EXPENSES | LIABILITIES | INCOME.
 */
export interface Journal {
  id?: number;
  branch_sync?: string;
  docdate?: string;
  docno?: string;
  accountperiod?: number;
  accountyear?: number;
  bookcode?: string;
  bookname?: string;
  accountcode?: string;
  accountname?: string;
  accounttype?: string;
  debit?: number;
  credit?: number;
  amount?: number;
  branchcode?: string;
  branchname?: string;
  accountdescription?: string;
  documentref?: string;
  createdby?: string;
  checkedby?: string;
  checkedat?: string;
  updatedby?: string;
  jobguidfixed?: string;
  exdocrefno?: string;
  createdat?: string;
  updatedat?: string;
}

export interface JournalPagination {
  page?: number;
  limit?: number;
  current_page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
}

export interface JournalSummary {
  branch_sync?: string;
  branch_code?: string;
  branch_name?: string;
  account_year?: string;
  total_debit?: number;
  total_credit?: number;
  current_balance?: number;
  transaction_count?: number;
  last_transaction_date?: string;
}

export interface JournalResponse {
  success?: boolean;
  data?: Journal[];
  summary?: JournalSummary;
  pagination?: JournalPagination;
}

export interface GetAllJournalsParams {
  page?: number;
  limit?: number;
  shopId?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  accountType?: string;
  status?: string;
}
