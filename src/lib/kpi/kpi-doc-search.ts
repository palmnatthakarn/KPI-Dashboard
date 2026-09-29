import type { KpiCombinedEmployee, KpiCombinedJournalItem, KpiCombinedTaskItem } from "@/types/kpi-combined";

/** "linked" = journals under a task; "unlinked" = journals not tied to any task. */
export type DocLinkFilter = "all" | "linked" | "unlinked";

export interface DocSearch {
  docNo: string;
  link: DocLinkFilter;
}

export const EMPTY_DOC_SEARCH: DocSearch = { docNo: "", link: "all" };

/** Trims/lowercases the document number so matching is partial and case-insensitive. */
export function normalizeDocSearch(search: DocSearch): DocSearch {
  return { docNo: search.docNo.trim().toLowerCase(), link: search.link };
}

export function isDocSearchActive(search: DocSearch): boolean {
  return search.docNo.trim() !== "" || search.link !== "all";
}

/** Expects a normalized search. An empty document number matches every journal. */
export function journalMatchesDocNo(journal: KpiCombinedJournalItem, search: DocSearch): boolean {
  return !search.docNo || (journal.docNo ?? "").toLowerCase().includes(search.docNo);
}

/** Expects a normalized search. */
export function taskMatchesDocSearch(task: KpiCombinedTaskItem, search: DocSearch): boolean {
  return search.link !== "unlinked" && task.journalEntries.some((journal) => journalMatchesDocNo(journal, search));
}

/** Expects a normalized search. Applies to journals not tied to any task. */
export function unlinkedJournalMatchesDocSearch(journal: KpiCombinedJournalItem, search: DocSearch): boolean {
  return search.link !== "linked" && journalMatchesDocNo(journal, search);
}

/**
 * Keeps only the employees and shops that contain a matching journal. Shop
 * and task objects are left intact so every KPI number keeps its real total;
 * the table narrows the tasks and journal cards it renders inside a shop.
 */
export function filterEmployeesByDocSearch(
  employees: KpiCombinedEmployee[],
  search: DocSearch
): KpiCombinedEmployee[] {
  if (!isDocSearchActive(search)) return employees;
  const normalized = normalizeDocSearch(search);

  return employees.flatMap((employee) => {
    const shopStats = employee.shopStats.filter(
      (shop) =>
        shop.tasks.some((task) => taskMatchesDocSearch(task, normalized)) ||
        shop.orphanJournalEntries.some((journal) => unlinkedJournalMatchesDocSearch(journal, normalized))
    );
    return shopStats.length > 0 ? [{ ...employee, shopStats }] : [];
  });
}

export interface MatchedJournal {
  shopName: string;
  /** null for a journal not tied to any task. */
  taskName: string | null;
  journal: KpiCombinedJournalItem;
}

/**
 * The journal cards a search surfaces for one employee, mirroring the table:
 * a document-number search lists its matches, and "unlinked" lists every
 * unassigned journal. "linked" alone lists nothing, because that would be
 * every keyed journal in the range.
 */
export function collectMatchedJournals(employee: KpiCombinedEmployee, search: DocSearch): MatchedJournal[] {
  if (!isDocSearchActive(search)) return [];
  const normalized = normalizeDocSearch(search);
  if (!normalized.docNo && normalized.link === "linked") return [];

  const matched: MatchedJournal[] = [];
  for (const shop of employee.shopStats) {
    if (normalized.link !== "unlinked") {
      for (const task of shop.tasks) {
        for (const journal of task.journalEntries) {
          if (journalMatchesDocNo(journal, normalized)) {
            matched.push({ shopName: shop.shopName, taskName: task.taskName, journal });
          }
        }
      }
    }
    for (const journal of shop.orphanJournalEntries) {
      if (unlinkedJournalMatchesDocSearch(journal, normalized)) {
        matched.push({ shopName: shop.shopName, taskName: null, journal });
      }
    }
  }
  return matched;
}

/** Human-readable summary of an active search, e.g. `เลขที่เอกสาร "0377" · ไม่ผูกงาน`. */
export function describeDocSearch(search: DocSearch): string {
  const parts: string[] = [];
  const docNo = search.docNo.trim();
  if (docNo) parts.push(`เลขที่เอกสาร "${docNo}"`);
  if (search.link === "linked") parts.push("ผูกงาน");
  if (search.link === "unlinked") parts.push("ไม่ผูกงาน");
  return parts.join(" · ");
}
