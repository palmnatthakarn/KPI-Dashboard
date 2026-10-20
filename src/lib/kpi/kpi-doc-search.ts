import type { KpiCombinedEmployee, KpiCombinedJournalItem, KpiCombinedTaskItem, KpiShopUpload } from "@/types/kpi-combined";
import type { DocumentImage } from "@/types/document-image";

/** "linked" = journals under a task; "unlinked" = journals not tied to any task. */
export type DocLinkFilter = "all" | "linked" | "unlinked";

export interface DocSearch {
  docNo: string;
  link: DocLinkFilter;
  /** Upload-date range as local YYYY-MM-DD days, both inclusive; "" leaves that side open. */
  uploadFrom: string;
  uploadTo: string;
}

export const EMPTY_DOC_SEARCH: DocSearch = { docNo: "", link: "all", uploadFrom: "", uploadTo: "" };

/** Trims/lowercases the document number so matching is partial and case-insensitive. */
export function normalizeDocSearch(search: DocSearch): DocSearch {
  return { ...search, docNo: search.docNo.trim().toLowerCase() };
}

/** An upload range switches the KPI page to the upload view (see groupUploadsByUploader). */
export function hasUploadRange(search: DocSearch): boolean {
  return Boolean(search.uploadFrom || search.uploadTo);
}

export function isDocSearchActive(search: DocSearch): boolean {
  return search.docNo.trim() !== "" || search.link !== "all" || hasUploadRange(search);
}

function isoDay(value: string, endOfDay: boolean): number {
  const [y, m, d] = value.split("-").map(Number);
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime() : new Date(y, m - 1, d).getTime();
}

/** True when there is no upload range, or `date` falls inside it. An unknown upload time never matches a range. */
export function uploadedInRange(date: Date | string | null | undefined, search: DocSearch): boolean {
  if (!hasUploadRange(search)) return true;
  const time = date ? new Date(date).getTime() : NaN;
  if (!Number.isFinite(time)) return false;
  return (!search.uploadFrom || time >= isoDay(search.uploadFrom, false)) && (!search.uploadTo || time <= isoDay(search.uploadTo, true));
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

function displayDay(value: string): string {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

/** Human-readable summary of an active search, e.g. `เลขที่เอกสาร "0377" · ไม่ผูกงาน`. */
export function describeDocSearch(search: DocSearch): string {
  const parts: string[] = [];
  const docNo = search.docNo.trim();
  if (docNo) parts.push(`เลขที่เอกสาร "${docNo}"`);
  if (search.link === "linked") parts.push("ผูกงาน");
  if (search.link === "unlinked") parts.push("ไม่ผูกงาน");
  if (search.uploadFrom && search.uploadTo) parts.push(`อัปโหลด ${displayDay(search.uploadFrom)} – ${displayDay(search.uploadTo)}`);
  else if (search.uploadFrom) parts.push(`อัปโหลดตั้งแต่ ${displayDay(search.uploadFrom)}`);
  else if (search.uploadTo) parts.push(`อัปโหลดถึง ${displayDay(search.uploadTo)}`);
  return parts.join(" · ");
}

export interface UploaderShopUploads {
  shopName: string;
  images: DocumentImage[];
}

export interface UploaderUploads {
  uploader: string;
  imageCount: number;
  shops: UploaderShopUploads[];
}

/**
 * The upload view: every image uploaded inside the search's upload range,
 * grouped by who uploaded it, then by shop — regardless of whether anyone
 * keyed it. Sorted by image count, most first.
 */
export function groupUploadsByUploader(
  uploads: KpiShopUpload[],
  search: DocSearch,
  employeeNames: string[] = []
): UploaderUploads[] {
  const onlyEmployees = new Set(employeeNames);
  const byUploader = new Map<string, Map<string, DocumentImage[]>>();
  for (const { shopName, image } of uploads) {
    const uploader = (image.uploadedBy ?? "").trim();
    if (!uploader || !uploadedInRange(image.uploadedAt, search)) continue;
    if (onlyEmployees.size > 0 && !onlyEmployees.has(uploader)) continue;
    const byShop = byUploader.get(uploader) ?? new Map<string, DocumentImage[]>();
    byUploader.set(uploader, byShop);
    byShop.set(shopName, [...(byShop.get(shopName) ?? []), image]);
  }

  return [...byUploader].map(([uploader, byShop]) => {
    const shops = [...byShop]
      .map(([shopName, images]) => ({ shopName, images }))
      .sort((a, b) => b.images.length - a.images.length);
    return { uploader, imageCount: shops.reduce((sum, shop) => sum + shop.images.length, 0), shops };
  }).sort((a, b) => b.imageCount - a.imageCount);
}
