import { apiClient } from "@/lib/api/client";
import type { GetAllJournalsParams, JournalBook, JournalDetail, JournalResponse } from "@/types/journal";

export interface GetAllGLJournalsParams {
  page?: number;
  limit?: number;
  shopId?: string;
  task?: string;
  sort?: string;
  timezone?: string;
  /** yyyy-MM-dd */
  startDate?: string;
  /** yyyy-MM-dd */
  endDate?: string;
}

/**
 * Ported from lib/services/journal_service.dart (getAllJournals only — the
 * rest of JournalService is ported alongside the Journal domain).
 * GET /journals
 */
export async function getAllJournals(
  params: GetAllJournalsParams = {}
): Promise<JournalResponse> {
  const { page = 1, limit = 50, shopId, startDate, endDate, transactionType, accountType, status } = params;

  const { data } = await apiClient.get<JournalResponse>("/journals", {
    params: {
      page,
      limit,
      ...(shopId ? { branch_sync: shopId } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
      ...(transactionType ? { transaction_type: transactionType } : {}),
      ...(accountType ? { account_type: accountType } : {}),
      ...(status ? { status } : {}),
    },
  });

  return data;
}

/**
 * Ported from JournalService.getAllGLJournals — GET /gl/journal. Note: the
 * backend ignores the `shopids` param and reads whichever shop was last
 * selected via POST /select-shop in this session, so callers (the KPI
 * Combined reconciliation) must call selectShop(shopId) immediately before
 * this, and fetch shops strictly sequentially — never in parallel.
 */
export async function getAllGLJournals(params: GetAllGLJournalsParams = {}): Promise<JournalResponse> {
  const { page = 1, limit = 1000, shopId, task, sort = "docdate:-1", timezone = "+07", startDate, endDate } = params;

  const { data } = await apiClient.get<JournalResponse>("/gl/journal", {
    params: {
      page,
      limit,
      sort,
      timezone,
      ...(shopId ? { shopids: shopId } : {}),
      ...(task ? { task } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    },
  });

  return data;
}

export async function getJournalBooks(): Promise<JournalBook[]> {
  const { data } = await apiClient.get<{ data?: JournalBook[] } | JournalBook[]>("/gl/journalbook");
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function getJournalDetailByDocNo(docNo: string): Promise<JournalDetail> {
  const { data } = await apiClient.get<{ data?: JournalDetail } | JournalDetail>(`/gl/journal/docno/${encodeURIComponent(docNo)}`);
  return "data" in data && data.data ? data.data : (data as JournalDetail);
}
