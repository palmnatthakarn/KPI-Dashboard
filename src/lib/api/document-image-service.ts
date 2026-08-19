import { apiClient } from "@/lib/api/client";
import { selectShop } from "@/lib/api/multi-shop-service";
import { parseDocumentImage, type DocumentImage } from "@/types/document-image";

/**
 * Ported from DocumentImageService.fetchDocNoToTaskGuidMap /
 * fetchShopBillCount (document_image_service.dart) — see the extensive
 * comments in that file for the backend quirks these work around:
 * `/documentimagegroup` reads the SESSION-selected shop (via POST
 * /select-shop), ignores query-param shop scoping, and its declared
 * pagination.perPage can be smaller than whatever perPage/limit was
 * requested — so pagination must loop using the response's own declared
 * page size/count, not the requested one.
 */

/**
 * Ported from DocumentImageService.fetchShopImages — GET /documentimage
 * (distinct from /documentimagegroup used elsewhere in this file). Powers
 * the Dashboard's "ดูรูปเอกสาร" image gallery dialog. Filters the response
 * to images actually tagged with this shop, falling back to the full list
 * if nothing is tagged (mirrors `_filterImagesByShop`'s behavior of not
 * hiding everything when the API doesn't tag shop ownership).
 */
export async function fetchShopImages(shopId: string): Promise<DocumentImage[]> {
  await selectShop(shopId);

  const { data } = await apiClient.get("/documentimage", { params: { shopid: shopId, limit: 9999 } });
  if (data?.success !== true || !Array.isArray(data?.data)) return [];

  const images = data.data.map(parseDocumentImage);
  return filterImagesByShop(images, shopId);
}

function normalizeShopId(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function filterImagesByShop(images: DocumentImage[], shopId: string): DocumentImage[] {
  const normalizedShopId = normalizeShopId(shopId);
  const tagged = images.filter((img) => (img.shopId ?? "").trim().length > 0);
  if (tagged.length === 0) return images;

  const matched = tagged.filter((img) => normalizeShopId(img.shopId) === normalizedShopId);
  return matched.length === 0 ? images : matched;
}

export interface DocNoToTaskGuidMapResult {
  docNoToTaskGuid: Map<string, string>;
  /** taskGuid -> (uploader -> image count) */
  taskUploaderCounts: Map<string, Map<string, number>>;
  totalItemsSeen: number;
  apiReportedTotal: number | null;
}

function parseIntSafe(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Math.trunc(value);
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

function firstValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value != null) return value;
  }
  return undefined;
}

function uploaderName(record: Record<string, unknown>): string {
  return String(
    firstValue(record, ["uploadedby", "uploadedBy", "uploaded_by", "createdby", "createdBy", "created_by"]) ?? ""
  ).trim();
}

/**
 * Builds a docNo -> taskGuid map (from `references[].docno`) and a
 * taskGuid -> uploader -> imageCount map (from `imagereferences[].uploadedby`,
 * falling back to the item's own top-level `uploadedby`), across every
 * `/documentimagegroup` page for the CURRENTLY session-selected shop.
 * Call `selectShop(shopId)` immediately before this, per call.
 */
export async function fetchDocNoToTaskGuidMap(params: {
  perPage?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<DocNoToTaskGuidMapResult> {
  const { perPage = 9999, fromDate, toDate } = params;

  const docNoToTaskGuid = new Map<string, string>();
  const taskUploaderCounts = new Map<string, Map<string, number>>();
  let totalItemsSeen = 0;
  let apiReportedTotal: number | null = null;

  try {
    let page = 1;
    let totalPages = 1;
    let actualPageSize: number | null = null;
    const maxPages = 500;

    do {
      const { data } = await apiClient.get("/documentimagegroup", {
        params: {
          page,
          perPage,
          limit: perPage,
          ...(fromDate ? { fromdate: fromDate } : {}),
          ...(toDate ? { todate: toDate } : {}),
        },
      });

      if (data?.success !== true || !Array.isArray(data?.data)) break;

      const items = data.data as Record<string, unknown>[];
      totalItemsSeen += items.length;

      for (const item of items) {
        const taskGuid = String(
          firstValue(item, ["taskguid", "taskGuid", "task_guid", "guidfixed", "guidFixed"]) ?? ""
        ).trim();
        if (!taskGuid) continue;

        const refsRaw = firstValue(item, ["references", "reference", "documentReferences"]);
        if (Array.isArray(refsRaw)) {
          for (const r of refsRaw) {
            const reference = r as Record<string, unknown>;
            const docNo = String(firstValue(reference, ["docno", "docNo", "doc_no"]) ?? "").trim();
            if (docNo) docNoToTaskGuid.set(docNo, taskGuid);
          }
        }

        const uploaderCounts = taskUploaderCounts.get(taskGuid) ?? new Map<string, number>();
        taskUploaderCounts.set(taskGuid, uploaderCounts);

        const imgRefsRaw = firstValue(item, [
          "imagereferences",
          "imageReferences",
          "image_references",
          "images",
        ]);
        if (Array.isArray(imgRefsRaw) && imgRefsRaw.length > 0) {
          for (const ir of imgRefsRaw) {
            const uploader = uploaderName(ir as Record<string, unknown>);
            if (!uploader) continue;
            uploaderCounts.set(uploader, (uploaderCounts.get(uploader) ?? 0) + 1);
          }
        } else {
          const uploader = uploaderName(item);
          if (uploader) uploaderCounts.set(uploader, (uploaderCounts.get(uploader) ?? 0) + 1);
        }
      }

      if (page === 1) {
        const p = data?.pagination;
        if (p) {
          if (p.totalPage != null) totalPages = parseIntSafe(p.totalPage) || 1;
          if (p.perPage != null) actualPageSize = parseIntSafe(p.perPage);
          if (p.total != null) apiReportedTotal = parseIntSafe(p.total);
        }
        actualPageSize ??= items.length;
      }

      if (actualPageSize != null && actualPageSize > 0 && items.length < actualPageSize) break;
      page++;
    } while (page <= totalPages && page <= maxPages);
  } catch {
    // Match Dart behavior: return whatever was built so far on error.
  }

  return { docNoToTaskGuid, taskUploaderCounts, totalItemsSeen, apiReportedTotal };
}

/**
 * Total `billcount` across every `/documentimagegroup` item for the
 * CURRENTLY session-selected shop — feeds `journalRequiredDocs`.
 */
export async function fetchShopBillCount(params: {
  perPage?: number;
  fromDate?: string;
  toDate?: string;
  ref?: number;
}): Promise<number> {
  const { perPage = 9999, fromDate, toDate, ref = 1 } = params;

  let total = 0;
  try {
    let page = 1;
    let totalPages = 1;
    let actualPageSize: number | null = null;
    const maxPages = 500;

    do {
      const { data } = await apiClient.get("/documentimagegroup", {
        params: {
          page,
          perPage,
          limit: perPage,
          ref,
          ...(fromDate ? { fromdate: fromDate } : {}),
          ...(toDate ? { todate: toDate } : {}),
        },
      });

      if (data?.success !== true || !Array.isArray(data?.data)) break;

      const items = data.data as Record<string, unknown>[];
      for (const item of items) {
        total += parseIntSafe(item?.billcount);
      }

      if (page === 1) {
        const p = data?.pagination;
        if (p) {
          if (p.totalPage != null) totalPages = parseIntSafe(p.totalPage) || 1;
          if (p.perPage != null) actualPageSize = parseIntSafe(p.perPage);
        }
        actualPageSize ??= items.length;
      }

      if (actualPageSize != null && actualPageSize > 0 && items.length < actualPageSize) break;
      page++;
    } while (page <= totalPages && page <= maxPages);
  } catch {
    // Match Dart behavior: return whatever total was accumulated so far.
  }

  return total;
}

/**
 * Total active documents currently returned by `/documentimagegroup` for
 * the selected date range. Unlike `fetchShopBillCount`, this intentionally
 * does not send the `ref=1` filter, so documents not linked to a task are
 * included while records already deleted from the endpoint are excluded.
 */
export async function fetchShopActiveDocumentCount(params: {
  perPage?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<number> {
  const { perPage = 9999, fromDate, toDate } = params;
  let total = 0;
  let page = 1;
  let totalPages = 1;

  do {
    const { data } = await apiClient.get("/documentimagegroup", {
      params: {
        page,
        perPage,
        limit: perPage,
        ...(fromDate ? { fromdate: fromDate } : {}),
        ...(toDate ? { todate: toDate } : {}),
      },
    });

    if (data?.success !== true || !Array.isArray(data?.data)) break;
    for (const item of data.data as Record<string, unknown>[]) {
      total += parseIntSafe(item.billcount);
    }

    const pagination = data?.pagination;
    totalPages = parseIntSafe(pagination?.totalPage ?? pagination?.total_page) || 1;
    page++;
  } while (page <= totalPages && page <= 500);

  return total;
}
