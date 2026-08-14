import type { Journal } from "@/types/journal";
import type { TaskItem } from "@/types/task";
import { getStatusCount } from "@/types/task";
import type {
  KpiCombinedEmployee,
  KpiCombinedJournalItem,
  KpiCombinedShopStat,
  KpiCombinedTaskItem,
} from "@/types/kpi-combined";

/**
 * Ported from KpiCombinedBloc's reconciliation algorithm
 * (kpi_combined_bloc.dart) — see the technical spec gathered before writing
 * this file. This is the highest-risk part of the KPI port to get exactly
 * right; interpretive gaps (marked with comments below) were filled in
 * favor of the most literal reading of the spec rather than guessing at
 * simplifications.
 */

export interface ShopFetchResult {
  shopName: string;
  tasks: TaskItem[];
  journals: Journal[];
  /** docNo -> taskGuid, from /documentimagegroup for this shop. */
  docNoToTaskGuid: Map<string, string>;
  /** taskGuid -> (uploader -> imageCount), from /documentimagegroup for this shop. */
  taskUploaderCounts: Map<string, Map<string, number>>;
  /** Shop-wide billcount total from /documentimagegroup, feeds journalRequiredDocs. */
  billCount: number;
  /** false if task fetch failed or GL journal pagination didn't complete — excluded from caching. */
  complete: boolean;
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function parseDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function inRange(date: Date | null, startOfDay: Date, endOfDay: Date): boolean {
  if (!date) return false;
  return date.getTime() >= startOfDay.getTime() && date.getTime() <= endOfDay.getTime();
}

function toKpiJournalItem(j: Journal, resolvedTaskGuid: string | null, resolvedFound: boolean): KpiCombinedJournalItem {
  return {
    docNo: j.docno ?? "",
    accountName: j.accountname ?? "",
    debit: j.debit ?? 0,
    credit: j.credit ?? 0,
    docDate: parseDateSafe(j.docdate),
    keyedAt: parseDateSafe(j.createdat),
    createdBy: j.createdby ?? "",
    checkedBy: j.checkedby ?? "",
    updatedBy: j.updatedby ?? "",
    jobGuidfixed: j.jobguidfixed ?? null,
    documentRef: j.documentref ?? null,
    resolvedTaskGuid,
    resolvedTaskGuidFound: resolvedFound,
    docNoMapSize: 0,
    docNoMapTotalItemsSeen: 0,
    docNoMapApiReportedTotal: null,
  };
}

/** Step 2 — resolveTaskGuid. */
function resolveTaskGuid(j: Journal, docNoToTaskGuid: Map<string, string>): string | null {
  const jobGuid = (j.jobguidfixed ?? "").trim();
  if (jobGuid) return jobGuid;
  const docNo = (j.docno ?? "").trim();
  if (docNo) return docNoToTaskGuid.get(docNo) ?? null;
  return null;
}

/** Step 4 — noPhotoAtAll, independent of isOrphanJournal. */
function isNoPhotoAtAll(j: Journal, resolved: string | null): boolean {
  const hasDocRef = (j.documentref ?? "").trim().length > 0;
  return !resolved && !hasDocRef;
}

interface ShopAcc {
  totalDocuments: number;
  waitingVerify: number;
  passed: number;
  cancelled: number;
  notRecorded: number;
  notRequiredApproval: number;
  requiredToRecord: number;
  recorded: number;
  completed: number;
  journalCount: number;
  journalCountNoPhoto: number;
  journalChecked: number;
  journalUpdated: number;
  uploadedCount: number;
  tasks: KpiCombinedTaskItem[];
  orphanJournalEntries: KpiCombinedJournalItem[];
  /** dedupe key set for orphan journal insertion, keyed by docNo+keyedAt. */
  _orphanSeen: Set<string>;
}

function newShopAcc(): ShopAcc {
  return {
    totalDocuments: 0,
    waitingVerify: 0,
    passed: 0,
    cancelled: 0,
    notRecorded: 0,
    notRequiredApproval: 0,
    requiredToRecord: 0,
    recorded: 0,
    completed: 0,
    journalCount: 0,
    journalCountNoPhoto: 0,
    journalChecked: 0,
    journalUpdated: 0,
    uploadedCount: 0,
    tasks: [],
    orphanJournalEntries: [],
    _orphanSeen: new Set(),
  };
}

function orphanKey(j: Journal): string {
  return `${j.docno ?? ""}|${j.createdat ?? ""}|${j.createdby ?? ""}`;
}

/**
 * Reconciles every shop's raw task/journal fetch results into a per-employee
 * KpiCombinedEmployee list for the given date range.
 */
export function reconcileKpiEmployees(
  shopResults: ShopFetchResult[],
  startDate: Date,
  endDate: Date
): KpiCombinedEmployee[] {
  const startOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

  // Step 1 — knownTaskGuids across every shop fetched in this call.
  const knownTaskGuids = new Set<string>();
  for (const shop of shopResults) {
    for (const t of shop.tasks) {
      if (t.guidfixed) knownTaskGuids.add(norm(t.guidfixed));
      if (t.taskChild?.guidfixed) knownTaskGuids.add(norm(t.taskChild.guidfixed));
    }
  }

  // employeeName -> shopName -> ShopAcc
  const byEmployeeShop = new Map<string, Map<string, ShopAcc>>();
  // employeeName -> shopName -> journalRequiredDocs (broadcast per shop)
  const requiredDocsByEmployeeShop = new Map<string, Map<string, number>>();
  // employeeName -> set of shop names touched (to broadcast journalRequiredDocs onto)
  const touchedShopsByEmployee = new Map<string, Set<string>>();

  function getAcc(employee: string, shopName: string): ShopAcc {
    let byShop = byEmployeeShop.get(employee);
    if (!byShop) {
      byShop = new Map();
      byEmployeeShop.set(employee, byShop);
    }
    let acc = byShop.get(shopName);
    if (!acc) {
      acc = newShopAcc();
      byShop.set(shopName, acc);
    }
    let touched = touchedShopsByEmployee.get(employee);
    if (!touched) {
      touched = new Set();
      touchedShopsByEmployee.set(employee, touched);
    }
    touched.add(shopName);
    return acc;
  }

  for (const shop of shopResults) {
    const { shopName, tasks, journals, docNoToTaskGuid, taskUploaderCounts, billCount } = shop;

    // Step 5 — group journals by resolved task guid within this shop.
    const journalsByTaskGuid = new Map<string, Journal[]>();
    const resolvedByJournal = new Map<Journal, { guid: string | null; noPhoto: boolean; orphan: boolean }>();
    for (const j of journals) {
      const resolved = resolveTaskGuid(j, docNoToTaskGuid);
      const noPhoto = isNoPhotoAtAll(j, resolved);
      const orphan = !resolved || !knownTaskGuids.has(norm(resolved));
      resolvedByJournal.set(j, { guid: resolved, noPhoto, orphan });
      if (resolved) {
        const key = norm(resolved);
        const list = journalsByTaskGuid.get(key) ?? [];
        list.push(j);
        journalsByTaskGuid.set(key, list);
      }
    }

    // Reverse lookup: parentGuidfixed -> child tasks, for "children via parentGuidfixed".
    const childrenByParent = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      const parent = norm(t.parentGuidfixed);
      if (parent) {
        const list = childrenByParent.get(parent) ?? [];
        list.push(t);
        childrenByParent.set(parent, list);
      }
    }

    // Only top-level tasks (no parent) become visible rows; child tasks' journal
    // activity is folded into their parent (step 7).
    const topLevelTasks = tasks.filter((t) => !norm(t.parentGuidfixed));

    for (const task of topLevelTasks) {
      const linkedGuids = new Set<string>([norm(task.guidfixed)]);
      for (const child of childrenByParent.get(norm(task.guidfixed)) ?? []) {
        linkedGuids.add(norm(child.guidfixed));
      }
      if (task.taskChild?.guidfixed) linkedGuids.add(norm(task.taskChild.guidfixed));

      const linkedJournalsAll: Journal[] = [];
      for (const guid of linkedGuids) {
        linkedJournalsAll.push(...(journalsByTaskGuid.get(guid) ?? []));
      }

      const taskHasInRangeJournal = linkedJournalsAll.some((j) => inRange(parseDateSafe(j.createdat), startOfDay, endOfDay));
      const ownerAtInRange = inRange(task.ownerAt, startOfDay, endOfDay);
      if (!ownerAtInRange && !taskHasInRangeJournal) continue; // Step 6 — task not included.

      const inRangeJournals = linkedJournalsAll.filter((j) => inRange(parseDateSafe(j.createdat), startOfDay, endOfDay));

      // Step 7 — combinedKeyerMap {creatorName -> count}.
      const combinedKeyerMap = new Map<string, number>();
      for (const j of inRangeJournals) {
        const creator = (j.createdby ?? "").trim();
        if (!creator) continue;
        combinedKeyerMap.set(creator, (combinedKeyerMap.get(creator) ?? 0) + 1);
      }

      // Uploader counts across all linked task guids for this task.
      const uploaderMap = new Map<string, number>();
      for (const guid of linkedGuids) {
        const uploaders = taskUploaderCounts.get(guid);
        if (!uploaders) continue;
        for (const [name, count] of uploaders) {
          uploaderMap.set(name, (uploaderMap.get(name) ?? 0) + count);
        }
      }

      // Step 10 — per-task derived status fields (reflect the task's real state).
      const taskPassed = getStatusCount(task, 1);
      const taskRequiredToRecord = taskPassed;
      const taskNotRecorded = getStatusCount(task, 3);
      const taskCancelled = getStatusCount(task, 2);
      let taskNotRequiredApproval = task.status === 6 ? task.totalDocument : getStatusCount(task, 6);
      let taskWaitingVerify = 0;
      let taskCompleted = 0;
      if (task.status === 4) {
        taskCompleted = task.totalDocument;
      } else if (task.status === 1) {
        taskWaitingVerify = task.totalDocument;
      } else if (task.status === 6) {
        taskWaitingVerify = getStatusCount(task, 0);
        taskNotRequiredApproval = task.totalDocument;
      }

      // Step 9 — owner's recorded count.
      const totalKeyedByOthers = Array.from(combinedKeyerMap.entries())
        .filter(([name]) => name !== task.ownerBy)
        .reduce((sum, [, count]) => sum + count, 0);
      const ownerRecorded =
        task.status === 6 ? task.referenceCount : Math.max(0, task.referenceCount - totalKeyedByOthers);
      const taskRemainingOwner = Math.max(0, taskRequiredToRecord - ownerRecorded);

      // Step 8 — owner row ("Row A").
      if (task.ownerBy) {
        const acc = getAcc(task.ownerBy, shopName);
        acc.totalDocuments += task.totalDocument;
        acc.waitingVerify += taskWaitingVerify;
        acc.passed += taskPassed;
        acc.cancelled += taskCancelled;
        acc.notRecorded += taskNotRecorded;
        acc.notRequiredApproval += taskNotRequiredApproval;
        acc.requiredToRecord += taskRequiredToRecord;
        acc.recorded += ownerRecorded;
        acc.completed += taskCompleted;

        acc.tasks.push({
          taskName: task.name,
          taskCode: task.code,
          status: task.status,
          totalDocument: task.totalDocument,
          ownerAt: task.ownerAt,
          ownerBy: task.ownerBy,
          isOwner: true,
          keyedByThisEmployee: 0,
          uploadedByThisEmployee: uploaderMap.get(task.ownerBy) ?? 0,
          journalEntries: inRangeJournals.map((j) => {
            const r = resolvedByJournal.get(j)!;
            return toKpiJournalItem(j, r.guid, !r.orphan);
          }),
          waitingVerify: taskWaitingVerify,
          passed: taskPassed,
          cancelled: taskCancelled,
          notRecorded: taskNotRecorded,
          notRequiredApproval: taskNotRequiredApproval,
          requiredToRecord: taskRequiredToRecord,
          recorded: ownerRecorded,
          remaining: taskRemainingOwner,
          completed: taskCompleted,
        });
      }

      // Step 8 — contributor rows ("Row B"): everyone in keyers ∪ uploaders, minus owner.
      const contributors = new Set<string>([...combinedKeyerMap.keys(), ...uploaderMap.keys()]);
      contributors.delete(task.ownerBy);

      for (const contributor of contributors) {
        const keyedDocumentCount = combinedKeyerMap.get(contributor) ?? 0;
        const uploadedByThisEmployee = uploaderMap.get(contributor) ?? 0;
        const contributorJournals = inRangeJournals.filter((j) => (j.createdby ?? "").trim() === contributor);

        const acc = getAcc(contributor, shopName);
        // Contributor rows do NOT add to totalDocuments/status totals — context only.
        acc.tasks.push({
          taskName: task.name,
          taskCode: task.code,
          status: task.status,
          totalDocument: task.totalDocument,
          ownerAt: task.ownerAt,
          ownerBy: task.ownerBy,
          isOwner: false,
          keyedByThisEmployee: keyedDocumentCount,
          uploadedByThisEmployee,
          journalEntries: contributorJournals.map((j) => {
            const r = resolvedByJournal.get(j)!;
            return toKpiJournalItem(j, r.guid, !r.orphan);
          }),
          waitingVerify: taskWaitingVerify,
          passed: taskPassed,
          cancelled: taskCancelled,
          notRecorded: taskNotRecorded,
          notRequiredApproval: taskNotRequiredApproval,
          requiredToRecord: taskRequiredToRecord,
          recorded: keyedDocumentCount,
          remaining: Math.max(0, taskRequiredToRecord - keyedDocumentCount),
          completed: taskCompleted,
        });
      }
    }

    // Step 11 — journal-side loop, independent of task inclusion.
    for (const j of journals) {
      const r = resolvedByJournal.get(j)!;
      const creator = (j.createdby ?? "").trim();
      const createdAt = parseDateSafe(j.createdat);
      const checkedAt = parseDateSafe(j.checkedat);
      const updatedAt = parseDateSafe(j.updatedat);

      if (creator && inRange(createdAt, startOfDay, endOfDay)) {
        const acc = getAcc(creator, shopName);
        if (r.noPhoto) {
          acc.journalCountNoPhoto += 1;
        } else {
          acc.journalCount += 1;
        }
        if (r.orphan && !r.noPhoto) {
          acc.totalDocuments += 1;
          const key = orphanKey(j);
          if (!acc._orphanSeen.has(key)) {
            acc._orphanSeen.add(key);
            acc.orphanJournalEntries.push(toKpiJournalItem(j, r.guid, false));
          }
        }
      }

      const checkedBy = (j.checkedby ?? "").trim();
      if (checkedBy && inRange(checkedAt, startOfDay, endOfDay)) {
        const acc = getAcc(checkedBy, shopName);
        acc.journalChecked += 1;
        if (r.orphan && !r.noPhoto && checkedBy !== creator) {
          const key = orphanKey(j);
          if (!acc._orphanSeen.has(key)) {
            acc._orphanSeen.add(key);
            acc.orphanJournalEntries.push(toKpiJournalItem(j, r.guid, false));
          }
        }
      }

      const updatedBy = (j.updatedby ?? "").trim();
      if (updatedBy && inRange(updatedAt, startOfDay, endOfDay)) {
        const acc = getAcc(updatedBy, shopName);
        acc.journalUpdated += 1;
        if (r.orphan && !r.noPhoto && updatedBy !== creator && updatedBy !== checkedBy) {
          const key = orphanKey(j);
          if (!acc._orphanSeen.has(key)) {
            acc._orphanSeen.add(key);
            acc.orphanJournalEntries.push(toKpiJournalItem(j, r.guid, false));
          }
        }
      }
    }

    // Step 12 — journalRequiredDocs, broadcast onto every employee touched by this shop.
    for (const [employee, shops] of touchedShopsByEmployee) {
      if (!shops.has(shopName)) continue;
      let byShop = requiredDocsByEmployeeShop.get(employee);
      if (!byShop) {
        byShop = new Map();
        requiredDocsByEmployeeShop.set(employee, byShop);
      }
      byShop.set(shopName, billCount);
    }
  }

  // Step 13 — assemble final employee list.
  const employees: KpiCombinedEmployee[] = [];
  for (const [employeeName, shopMap] of byEmployeeShop) {
    const shopStats: KpiCombinedShopStat[] = [];
    let totalDocuments = 0;
    let waitingVerify = 0;
    let passedDocuments = 0;
    let cancelledDocuments = 0;
    let notRecordedDocuments = 0;
    let notRequiredApprovalDocuments = 0;
    let requiredToRecordDocuments = 0;
    let recordedDocuments = 0;
    let completedDocuments = 0;
    let journalRequiredDocs = 0;
    let totalJournals = 0;
    let totalJournalsNoPhoto = 0;
    let totalChecked = 0;
    let totalUpdated = 0;
    let totalUploaded = 0;
    let lastActive: Date | null = null;

    for (const [shopName, acc] of shopMap) {
      const reqDocs = requiredDocsByEmployeeShop.get(employeeName)?.get(shopName) ?? 0;
      const uploadedInShop = acc.tasks.reduce((sum, t) => sum + t.uploadedByThisEmployee, 0);

      shopStats.push({
        shopName,
        totalDocuments: acc.totalDocuments,
        waitingVerify: acc.waitingVerify,
        passed: acc.passed,
        cancelled: acc.cancelled,
        notRecorded: acc.notRecorded,
        notRequiredApproval: acc.notRequiredApproval,
        requiredToRecord: acc.requiredToRecord,
        recorded: acc.recorded,
        remaining: Math.max(0, acc.requiredToRecord - acc.recorded),
        completed: acc.completed,
        journalRequiredDocs: reqDocs,
        journalCount: acc.journalCount,
        journalCountNoPhoto: acc.journalCountNoPhoto,
        journalChecked: acc.journalChecked,
        journalUpdated: acc.journalUpdated,
        uploadedCount: uploadedInShop,
        tasks: [...acc.tasks].sort((a, b) => b.ownerAt.getTime() - a.ownerAt.getTime()),
        orphanJournalEntries: acc.orphanJournalEntries,
      });

      totalDocuments += acc.totalDocuments;
      waitingVerify += acc.waitingVerify;
      passedDocuments += acc.passed;
      cancelledDocuments += acc.cancelled;
      notRecordedDocuments += acc.notRecorded;
      notRequiredApprovalDocuments += acc.notRequiredApproval;
      requiredToRecordDocuments += acc.requiredToRecord;
      recordedDocuments += acc.recorded;
      completedDocuments += acc.completed;
      journalRequiredDocs += reqDocs;
      totalJournals += acc.journalCount;
      totalJournalsNoPhoto += acc.journalCountNoPhoto;
      totalChecked += acc.journalChecked;
      totalUpdated += acc.journalUpdated;
      totalUploaded += uploadedInShop;

      for (const t of acc.tasks) {
        if (!lastActive || t.ownerAt.getTime() > lastActive.getTime()) lastActive = t.ownerAt;
      }
    }

    shopStats.sort((a, b) => b.totalDocuments - a.totalDocuments);

    employees.push({
      name: employeeName,
      lastActive,
      totalDocuments,
      waitingVerify,
      passedDocuments,
      cancelledDocuments,
      notRecordedDocuments,
      notRequiredApprovalDocuments,
      requiredToRecordDocuments,
      recordedDocuments,
      remainingDocuments: Math.max(0, requiredToRecordDocuments - recordedDocuments),
      completedDocuments,
      journalRequiredDocs,
      totalJournals,
      totalJournalsNoPhoto,
      totalChecked,
      totalUpdated,
      totalUploaded,
      shopStats,
    });
  }

  employees.sort((a, b) => b.totalDocuments + b.totalJournals - (a.totalDocuments + a.totalJournals));
  return employees;
}
