import { getAllJournals } from "@/lib/api/journal-service";
import type { Journal } from "@/types/journal";
import type { DocDetails, MonthlyData, DailyTransactionEntry } from "@/types/shop";

/**
 * Local fallback data source, ported from lib/services/dashboard_service.dart.
 * Used when the multi-shop-summary cloud API is unavailable — builds
 * per-branch DocDetails by grouping raw /journals records by branch_sync.
 */
export async function fetchDashboardData(): Promise<DocDetails[]> {
  const response = await getAllJournals({ limit: 1000 });
  const journals = response.data ?? [];

  const branchGroups = new Map<string, Journal[]>();
  for (const journal of journals) {
    const branchSync = journal.branch_sync ?? "";
    if (!branchSync) continue;
    if (!branchGroups.has(branchSync)) branchGroups.set(branchSync, []);
    branchGroups.get(branchSync)!.push(journal);
  }

  const docDetailsList: DocDetails[] = [];
  for (const [branchSync, group] of branchGroups) {
    if (group.length === 0) continue;
    const branchName = group[0].branchname || `ร้าน ${branchSync}`;

    docDetailsList.push({
      shopid: branchSync,
      shopname: branchName,
      daily: buildDailyTransactions(group),
      monthly_summary: buildMonthlySummary(group),
      responsible: { name: "ระบบอัตโนมัติ", role: "system" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      timezone: "Asia/Bangkok",
      daily_images: [],
      daily_transactions: group.map((j) => ({
        doc_datetime: j.docdate,
        doc_no: j.docno,
        account_type: j.accounttype,
        credit: j.credit,
        debit: j.debit,
        account_name: j.accountname,
        description: `${j.accountname ?? ""} - ${j.bookname ?? ""}`,
      })),
    });
  }

  return docDetailsList;
}

function formatDateString(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    let date: Date | null = null;
    if (dateStr.includes("T")) {
      date = new Date(dateStr);
    } else if (dateStr.includes("-")) {
      date = new Date(dateStr.split(" ")[0]);
    } else if (dateStr.length === 8) {
      date = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`);
    }
    if (date && !Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  } catch {
    // fall through
  }
  return "";
}

function amountForJournal(journal: Journal): number {
  const accountType = journal.accounttype?.toUpperCase();
  if (accountType === "INCOME") return (journal.credit ?? 0) - (journal.debit ?? 0);
  if (accountType === "EXPENSES" || accountType === "LIABILITIES") {
    return (journal.debit ?? 0) - (journal.credit ?? 0);
  }
  return 0;
}

function buildDailyTransactions(journals: Journal[]): DailyTransactionEntry[] {
  const dailyTotals = new Map<string, number>();
  for (const journal of journals) {
    const date = formatDateString(journal.docdate);
    if (!date) continue;
    const amount = amountForJournal(journal);
    dailyTotals.set(date, (dailyTotals.get(date) ?? 0) + amount);
  }
  return Array.from(dailyTotals.entries()).map(([date, value]) => ({
    timestamp: date,
    deposit: value > 0 ? value : 0,
    withdraw: value < 0 ? -value : 0,
  }));
}

function buildMonthlySummary(journals: Journal[]): Record<string, MonthlyData> {
  const summary: Record<string, MonthlyData> = {};
  for (const journal of journals) {
    const date = formatDateString(journal.docdate);
    if (!date) continue;
    const monthKey = date.slice(0, 7);

    const accountType = journal.accounttype?.toUpperCase();
    let income = 0;
    let expense = 0;
    if (accountType === "INCOME") income = (journal.credit ?? 0) - (journal.debit ?? 0);
    else if (accountType === "EXPENSES" || accountType === "LIABILITIES") {
      expense = (journal.debit ?? 0) - (journal.credit ?? 0);
    }

    const existing = summary[monthKey] ?? { deposit: 0, withdraw: 0 };
    summary[monthKey] = {
      deposit: (existing.deposit ?? 0) + income,
      withdraw: (existing.withdraw ?? 0) + expense,
    };
  }
  return summary;
}
