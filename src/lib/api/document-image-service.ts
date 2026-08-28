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
export async function fetchShopImages(
  shopId: string,
  range: { fromDate?: string; toDate?: string } = {}
): Promise<DocumentImage[]> {
  await selectShop(shopId);

  const { data } = await apiClient.get("/documentimage", {
    params: {
      shopid: shopId,
      limit: 9999,
      ...(range.fromDate ? { fromdate: range.fromDate } : {}),
      ...(range.toDate ? { todate: range.toDate } : {}),
    },
  });
  if (data?.success !== true || !Array.isArray(data?.data)) return [];

  const images = data.data.map(parseDocumentImage);
  return filterImagesByDate(filterImagesByShop(images, shopId), range);
}

function filterImagesByDate(
  images: DocumentImage[],
  range: { fromDate?: string; toDate?: string }
): DocumentImage[] {
  if (!range.fromDate && !range.toDate) return images;

  const from = range.fromDate ? new Date(`${range.fromDate}T00:00:00`).getTime() : null;
  const to = range.toDate ? new Date(`${range.toDate}T23:59:59.999`).getTime() : null;
  const dated = images.filter(
    (image) => image.uploadedAt && Number.isFinite(new Date(image.uploadedAt).getTime())
  );
  if (dated.length === 0) return images;

  return dated.filter((image) => {
    const uploadedAt = new Date(image.uploadedAt!).getTime();
    return (from == null || uploadedAt >= from) && (to == null || uploadedAt <= to);
  });
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
  /** taskGuid -> exact image-reference records used by KPI and Overview. */
  taskUploadedImages: Map<string, DocumentImage[]>;
  /** documentref (group guid or references[].guidfixed) -> real imagereferences. */
  documentRefUploadedImages: Map<string, DocumentImage[]>;
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

function toDateOnly(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function billDate(record: Record<string, unknown>): string | null {
  return toDateOnly(firstValue(record, [
    "billdate", "billDate", "bill_date", "docdate", "docDate", "doc_date",
    "documentdate", "documentDate", "document_date",
  ]));
}

function referencesFor(item: Record<string, unknown>): Record<string, unknown>[] {
  const raw = firstValue(item, ["references", "reference", "documentReferences"]);
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
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
  taskGuid?: string;
}): Promise<DocNoToTaskGuidMapResult> {
  const { perPage = 9999, fromDate, toDate, taskGuid } = params;

  const docNoToTaskGuid = new Map<string, string>();
  const taskUploaderCounts = new Map<string, Map<string, number>>();
  const taskUploadedImages = new Map<string, DocumentImage[]>();
  const documentRefUploadedImages = new Map<string, DocumentImage[]>();
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
          ...(taskGuid ? { taskguid: taskGuid } : {}),
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
        const referenceGuids: string[] = [];
        if (Array.isArray(refsRaw)) {
          for (const r of refsRaw) {
            const reference = r as Record<string, unknown>;
            const docNo = String(firstValue(reference, ["docno", "docNo", "doc_no"]) ?? "").trim();
            if (docNo) docNoToTaskGuid.set(docNo, taskGuid);
            const referenceGuid = String(
              firstValue(reference, ["guidfixed", "guidFixed", "guid_fixed"]) ?? ""
            ).trim();
            if (referenceGuid) referenceGuids.push(referenceGuid);
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
          const groupGuid = String(
            firstValue(item, ["guidfixed", "guidFixed", "guid_fixed"]) ?? ""
          ).trim();
          const groupTitle = String(firstValue(item, ["title", "name"]) ?? "").trim();
          const groupOrder = parseIntSafe(firstValue(item, ["xorder", "xOrder", "x_order"]));
          const groupDocNo =
            Array.isArray(refsRaw) && refsRaw.length > 0
              ? String(
                  firstValue(refsRaw[0] as Record<string, unknown>, ["docno", "docNo", "doc_no"]) ?? ""
                ).trim()
              : "";
          const uploadedImages = taskUploadedImages.get(taskGuid) ?? [];
          taskUploadedImages.set(taskGuid, uploadedImages);
          const groupImages: DocumentImage[] = [];
          for (const ir of imgRefsRaw) {
            const imageReference = ir as Record<string, unknown>;
            const uploader = uploaderName(imageReference);
            if (uploader) uploaderCounts.set(uploader, (uploaderCounts.get(uploader) ?? 0) + 1);
            const image: DocumentImage = {
              ...parseDocumentImage(imageReference),
              groupId: groupGuid || null,
              groupTitle: groupTitle || null,
              groupOrder,
              groupDocNo: groupDocNo || null,
            };
            if (image.imageId || image.imageUrl) {
              uploadedImages.push(image);
              groupImages.push(image);
            }
          }

          for (const documentRef of [groupGuid, ...referenceGuids]) {
            if (!documentRef) continue;
            documentRefUploadedImages.set(documentRef.toLowerCase(), groupImages);
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

  return {
    docNoToTaskGuid,
    taskUploaderCounts,
    taskUploadedImages,
    documentRefUploadedImages,
    totalItemsSeen,
    apiReportedTotal,
  };
}

/**
 * Resolves a GL journal documentref through the group-detail endpoint.
 * This is required for images uploaded directly from GL without a task:
 * those groups are not guaranteed to appear in the task-oriented list response.
 */
export async function fetchDocumentImageGroupImages(documentRef: string): Promise<DocumentImage[]> {
  const ref = documentRef.trim();
  if (!ref) return [];

  try {
    const { data } = await apiClient.get(`/documentimagegroup/${encodeURIComponent(ref)}`);
    if (data?.success !== true || !data?.data || typeof data.data !== "object") return [];

    const item = data.data as Record<string, unknown>;
    const groupGuid = String(firstValue(item, ["guidfixed", "guidFixed", "guid_fixed"]) ?? "").trim();
    const groupTitle = String(firstValue(item, ["title", "name"]) ?? "").trim();
    const groupOrder = parseIntSafe(firstValue(item, ["xorder", "xOrder", "x_order"]));
    const refsRaw = firstValue(item, ["references", "reference", "documentReferences"]);
    const groupDocNo =
      Array.isArray(refsRaw) && refsRaw.length > 0
        ? String(
            firstValue(refsRaw[0] as Record<string, unknown>, ["docno", "docNo", "doc_no"]) ?? ""
          ).trim()
        : "";
    const imgRefsRaw = firstValue(item, [
      "imagereferences",
      "imageReferences",
      "image_references",
      "images",
    ]);
    if (!Array.isArray(imgRefsRaw)) return [];

    return imgRefsRaw
      .map((imageReference) => ({
        ...parseDocumentImage(imageReference as Record<string, unknown>),
        groupId: groupGuid || ref,
        groupTitle: groupTitle || null,
        groupOrder,
        groupDocNo: groupDocNo || null,
      }))
      .filter((image) => Boolean(image.imageId || image.imageUrl));
  } catch {
    return [];
  }
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
 * Total active bills from `/documentimagegroup` whose bill/document date is
 * in the selected range. The endpoint's fromdate/todate parameters filter by
 * upload/import time on some deployments, so this fetch is deliberately
 * undated and the bill references are filtered client-side instead.
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
      },
    });

    if (data?.success !== true || !Array.isArray(data?.data)) break;
    for (const item of data.data as Record<string, unknown>[]) {
      const references = referencesFor(item);
      if (references.length > 0) {
        total += references.filter((reference) => {
          const date = billDate(reference) ?? billDate(item);
          return date != null && (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
        }).length;
        continue;
      }
      const date = billDate(item);
      if (date != null && (!fromDate || date >= fromDate) && (!toDate || date <= toDate)) {
        total += parseIntSafe(item.billcount) || 1;
      }
    }

    const pagination = data?.pagination;
    totalPages = parseIntSafe(pagination?.totalPage ?? pagination?.total_page) || 1;
    page++;
  } while (page <= totalPages && page <= 500);

  return total;
}
