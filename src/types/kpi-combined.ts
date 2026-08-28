/**
 * Ported 1:1 from lib/models/kpi_combined_employee.dart. These are pure
 * in-memory aggregation results built by the reconciliation algorithm in
 * lib/kpi/kpi-combined-service.ts (ported from KpiCombinedBloc) — never
 * deserialized directly from an API response, so there's no raw JSON shape
 * to match here.
 */

import type { DocumentImage } from "@/types/document-image";

export interface KpiCombinedJournalItem {
  docNo: string;
  accountName: string;
  debit: number;
  credit: number;
  /** Document's own dated period (docdate) — display-only fallback. */
  docDate: Date | null;
  /** createdat — the timestamp actually used for date-range filtering and display ("คีย์เมื่อ"). */
  keyedAt: Date | null;
  createdBy: string;
  checkedBy: string;
  updatedBy: string;
  jobGuidfixed: string | null;
  /** Raw documentref — separate signal from jobGuidfixed, "(Manual)" evidence. */
  documentRef: string | null;
  /** Diagnostic only, populated for orphan entries. */
  resolvedTaskGuid: string | null;
  resolvedTaskGuidFound: boolean;
  docNoMapSize: number;
  docNoMapTotalItemsSeen: number;
  docNoMapApiReportedTotal: number | null;
}

export interface KpiCombinedTaskItem {
  taskName: string;
  taskCode: string;
  status: number;
  totalDocument: number;
  ownerAt: Date;
  ownerBy: string;
  /** true = owner row ("Row A"), false = contributor row ("Row B"). */
  isOwner: boolean;
  /** Only meaningful when isOwner === false. */
  keyedByThisEmployee: number;
  /** Images this employee uploaded on this task (from /documentimagegroup). */
  uploadedByThisEmployee: number;
  /** The exact image-reference records behind uploadedByThisEmployee. */
  uploadedImages: DocumentImage[];
  /** Owner row = every entry linked to task; contributor row = scoped to just that employee's own entries. */
  journalEntries: KpiCombinedJournalItem[];
  waitingVerify: number;
  passed: number;
  cancelled: number;
  notRecorded: number;
  notRequiredApproval: number;
  requiredToRecord: number;
  recorded: number;
  remaining: number;
  completed: number;
}

export interface KpiCombinedShopStat {
  shopName: string;
  totalDocuments: number;
  waitingVerify: number;
  passed: number;
  cancelled: number;
  notRecorded: number;
  notRequiredApproval: number;
  requiredToRecord: number;
  recorded: number;
  remaining: number;
  completed: number;
  /** "ต้องบันทึก" from /documentimagegroup bill count — different source than requiredToRecord. */
  journalRequiredDocs: number;
  /** คีย์ — keyed entries WITH some evidence (jobguidfixed, photo, or documentRef). */
  journalCount: number;
  /** คีย์(ไม่มีรูป) — keyed entries with zero evidence at all. */
  journalCountNoPhoto: number;
  journalChecked: number;
  journalUpdated: number;
  /** Total images this employee uploaded in this shop (not gated by task ownership). */
  uploadedCount: number;
  /** Exact uploaded-image records included in this employee/shop KPI row. */
  uploadedImages: DocumentImage[];
  /** Sorted by ownerAt descending. */
  tasks: KpiCombinedTaskItem[];
  /** GL rows counted in totals above but whose resolved task guid isn't in `tasks`. */
  orphanJournalEntries: KpiCombinedJournalItem[];
}

export function journalCountTotal(shop: KpiCombinedShopStat): number {
  return shop.journalCount + shop.journalCountNoPhoto;
}

export function journalRemaining(shop: KpiCombinedShopStat): number {
  return Math.max(0, shop.journalRequiredDocs - shop.journalCount);
}

export interface KpiCombinedEmployee {
  name: string;
  lastActive: Date | null;
  totalDocuments: number;
  waitingVerify: number;
  passedDocuments: number;
  cancelledDocuments: number;
  notRecordedDocuments: number;
  notRequiredApprovalDocuments: number;
  requiredToRecordDocuments: number;
  recordedDocuments: number;
  remainingDocuments: number;
  completedDocuments: number;
  journalRequiredDocs: number;
  totalJournals: number;
  totalJournalsNoPhoto: number;
  totalChecked: number;
  totalUpdated: number;
  totalUploaded: number;
  shopStats: KpiCombinedShopStat[];
}

export function totalJournalsCombined(emp: KpiCombinedEmployee): number {
  return emp.totalJournals + emp.totalJournalsNoPhoto;
}

export function employeeJournalRemaining(emp: KpiCombinedEmployee): number {
  return Math.max(0, emp.journalRequiredDocs - emp.totalJournals);
}

export interface KpiCombinedShopItem {
  shopId: string;
  shopName: string;
}
