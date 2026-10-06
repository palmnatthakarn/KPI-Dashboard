import type { KpiCombinedEmployee } from "@/types/kpi-combined";

/** Minimal valid KpiCombinedEmployee for tests that only care about a few fields. */
export function makeEmployee(
  name: string,
  overrides: Partial<KpiCombinedEmployee> = {}
): KpiCombinedEmployee {
  return {
    name,
    lastActive: null,
    totalDocuments: 0,
    waitingVerify: 0,
    passedDocuments: 0,
    cancelledDocuments: 0,
    notRecordedDocuments: 0,
    notRequiredApprovalDocuments: 0,
    requiredToRecordDocuments: 0,
    recordedDocuments: 0,
    remainingDocuments: 0,
    completedDocuments: 0,
    journalRequiredDocs: 0,
    totalJournals: 0,
    totalJournalsNoPhoto: 0,
    totalChecked: 0,
    totalUpdated: 0,
    totalUploaded: 0,
    totalOcrAnalyzed: 0,
    shopStats: [],
    ...overrides,
  };
}
