import { listShops as listShopsRaw } from "@/lib/api/multi-shop-service";
import { fetchTasksForShop } from "@/lib/api/task-service";
import { getAllGLJournals } from "@/lib/api/journal-service";
import { fetchDocNoToTaskGuidMap, fetchShopBillCount } from "@/lib/api/document-image-service";
import { saveKnownEmployees } from "@/lib/employee/employee-mapping-service";
import { reconcileKpiEmployees, type ShopFetchResult } from "@/lib/kpi/kpi-reconcile";
import type { KpiCombinedEmployee, KpiCombinedShopItem } from "@/types/kpi-combined";

/**
 * Ported from KpiCombinedBloc's fetch orchestration (kpi_combined_bloc.dart).
 * Critical constraint carried over from the Flutter source: `/gl/journal`
 * and `/documentimagegroup` both ignore query-param shop scoping and read
 * whichever shop was last selected via POST /select-shop in this session —
 * so shops MUST be fetched strictly sequentially, never in parallel, or
 * data will cross-contaminate between shops.
 */

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ported from MultiShopService.listShops() normalization used by KpiCombinedBloc. */
export async function listKpiShops(): Promise<KpiCombinedShopItem[]> {
  const raw = await listShopsRaw();
  return raw
    .map((item) => {
      const shopId = String(item.shopid ?? item.shop_id ?? item.id ?? "");
      const names = item.names as { code?: string; name?: string }[] | undefined;
      const thaiName = Array.isArray(names) ? names.find((n) => n.code === "th") ?? names[0] : undefined;
      const shopName = String(item.shopname ?? item.shop_name ?? thaiName?.name ?? shopId);
      return { shopId, shopName };
    })
    .filter((s) => s.shopId);
}

const GL_JOURNAL_PAGE_LIMIT = 1000;

/** Ported from JournalService.getAllGLJournals's pagination loop inside the bloc. */
async function fetchAllGLJournalsForShop(shopId: string, startDate: string, endDate: string) {
  const journals: import("@/types/journal").Journal[] = [];
  let page = 1;
  let complete = true;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let attempt = 0;
    let pageData: Awaited<ReturnType<typeof getAllGLJournals>> | null = null;
    while (attempt < 3) {
      try {
        pageData = await getAllGLJournals({
          page,
          limit: GL_JOURNAL_PAGE_LIMIT,
          shopId,
          task: "GL Journal",
          startDate,
          endDate,
        });
        break;
      } catch {
        attempt++;
        if (attempt >= 3) {
          complete = false;
          break;
        }
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
    if (!pageData) break;

    const items = pageData.data ?? [];
    journals.push(...items);

    const totalPages = pageData.pagination?.total_pages ?? 1;
    if (items.length < GL_JOURNAL_PAGE_LIMIT || page >= totalPages) break;
    page++;
  }

  return { journals, complete };
}

/** Fetches one shop's task + GL journal + document-image data, strictly after selecting that shop. */
async function fetchShopData(shopId: string, shopName: string, startDate: Date, endDate: Date): Promise<ShopFetchResult> {
  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);

  let tasks: import("@/types/task").TaskItem[] = [];
  let taskFetchOk = true;
  try {
    const taskResponse = await fetchTasksForShop({ shopId, limit: 5000, status: [0, 1, 2, 3, 4, 5, 6] });
    tasks = taskResponse.tasks;
  } catch {
    taskFetchOk = false;
  }

  // None of these three call selectShop themselves, so they're safe to run concurrently
  // once the shop has been selected by fetchTasksForShop above.
  const [glResult, docNoMapResult, billCount] = await Promise.all([
    fetchAllGLJournalsForShop(shopId, startIso, endIso),
    fetchDocNoToTaskGuidMap({ fromDate: startIso, toDate: endIso }).catch(() => ({
      docNoToTaskGuid: new Map<string, string>(),
      taskUploaderCounts: new Map<string, Map<string, number>>(),
      totalItemsSeen: 0,
      apiReportedTotal: null,
    })),
    fetchShopBillCount({ fromDate: startIso, toDate: endIso }).catch(() => 0),
  ]);

  return {
    shopName,
    tasks,
    journals: glResult.journals,
    docNoToTaskGuid: docNoMapResult.docNoToTaskGuid,
    taskUploaderCounts: docNoMapResult.taskUploaderCounts,
    billCount,
    complete: taskFetchOk && glResult.complete,
  };
}

interface CacheEntry {
  employees: KpiCombinedEmployee[];
  expiresAt: number;
}

interface FetchOutcome {
  employees: KpiCombinedEmployee[];
  incompleteShops: string[];
}

const CACHE_TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<FetchOutcome>>();

function cacheKey(shopIds: string[], startDate: Date, endDate: Date): string {
  const sorted = [...shopIds].sort().join(",");
  return `${sorted}|${toIsoDate(startDate)}|${toIsoDate(endDate)}`;
}

export interface FetchKpiCombinedParams {
  /** Empty = all shops. */
  shopIds: string[];
  shopNames: string[];
  startDate: Date;
  endDate: Date;
  forceRefresh?: boolean;
}

export interface FetchKpiCombinedResult {
  employees: KpiCombinedEmployee[];
  shops: KpiCombinedShopItem[];
  /** Shop names whose fetch didn't complete fully (task fetch failed or GL journal pagination gave up). */
  incompleteShops: string[];
}

export async function fetchKpiCombinedData(params: FetchKpiCombinedParams): Promise<FetchKpiCombinedResult> {
  const { shopIds, startDate, endDate, forceRefresh = false } = params;

  const allShops = await listKpiShops();
  const targetShops = shopIds.length > 0 ? allShops.filter((s) => shopIds.includes(s.shopId)) : allShops;

  const key = cacheKey(
    targetShops.map((s) => s.shopId),
    startDate,
    endDate
  );

  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { employees: cached.employees, shops: allShops, incompleteShops: [] };
    }
    const pending = inFlight.get(key);
    if (pending) {
      const outcome = await pending;
      return { employees: outcome.employees, shops: allShops, incompleteShops: outcome.incompleteShops };
    }
  }

  const promise: Promise<FetchOutcome> = (async () => {
    const shopResults: ShopFetchResult[] = [];
    const incompleteShops: string[] = [];

    // Strictly sequential — see module doc comment. Shop selection happens
    // inside fetchShopData (via fetchTasksForShop -> selectShop), so each
    // iteration only proceeds to the next shop once the current one's
    // selection + fetch has fully settled.
    for (const shop of targetShops) {
      const result = await fetchShopData(shop.shopId, shop.shopName, startDate, endDate);
      if (!result.complete) incompleteShops.push(shop.shopName);
      shopResults.push(result);
    }

    const employees = reconcileKpiEmployees(shopResults, startDate, endDate);

    if (incompleteShops.length === 0) {
      cache.set(key, { employees, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    saveKnownEmployees(employees.map((e) => e.name));

    return { employees, incompleteShops };
  })();

  inFlight.set(key, promise);
  try {
    const outcome = await promise;
    return { employees: outcome.employees, shops: allShops, incompleteShops: outcome.incompleteShops };
  } finally {
    inFlight.delete(key);
  }
}

export function clearKpiCombinedCache(): void {
  cache.clear();
  inFlight.clear();
}

export function getCurrentMonthRange(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate, endDate };
}
