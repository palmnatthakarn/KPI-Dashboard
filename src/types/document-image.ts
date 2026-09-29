/** Ported 1:1 from DocumentImage (document_image_service.dart). */
export interface DocumentImage {
  imageId: string | null;
  shopId: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
  imageUrl: string | null;
  /** True when its /documentimagegroup item (or the image itself) has a non-empty `ocranalyzeai`. */
  ocrAnalyzed?: boolean;
  /** Parent /documentimagegroup identity. Images sharing this value are one set. */
  groupId?: string | null;
  groupTitle?: string | null;
  groupOrder?: number | null;
  groupDocNo?: string | null;
}

export function getDocumentImageGroupKey(
  image: DocumentImage,
  fallbackIndex = 0
): string {
  return (
    image.groupId ||
    `single:${image.imageId ?? image.imageUrl ?? fallbackIndex}`
  );
}

export function countDocumentImageGroups(images: DocumentImage[]): number {
  const groups = new Set<string>();
  images.forEach((image, index) => {
    groups.add(getDocumentImageGroupKey(image, index));
  });
  return groups.size;
}

/**
 * Number of image sets whose `ocranalyzeai` has a value: each analyzed
 * /documentimagegroup item counts 1, an empty/missing one counts 0.
 */
export function countOcrAnalyzedGroups(images: DocumentImage[]): number {
  const groups = new Set<string>();
  images.forEach((image, index) => {
    if (image.ocrAnalyzed) groups.add(getDocumentImageGroupKey(image, index));
  });
  return groups.size;
}

/**
 * OCR-analyzed sets credited to one employee. `ocranalyzeai` does not record
 * who ran the OCR, so the set is credited to whoever uploaded its images —
 * not to people who only keyed journals referencing it.
 */
export function countOcrAnalyzedGroupsUploadedBy(images: DocumentImage[], uploader: string): number {
  const target = uploader.trim().toLowerCase();
  return countOcrAnalyzedGroups(
    images.filter((image) => (image.uploadedBy ?? "").trim().toLowerCase() === target)
  );
}

export function hasOcrAnalysis(value: unknown): boolean {
  if (value == null || value === false) return false;
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 && !["null", "{}", "[]", "false"].includes(text.toLowerCase());
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function resolveDocumentImageUrl(value: unknown): string | null {
  const raw = value?.toString().trim();
  if (!raw) return null;

  // Some deployments wrap the URL in Markdown: [url](url).
  const markdownUrl = raw.match(/^\[(https?:\/\/[^\]]+)\]\((https?:\/\/[^)]+)\)$/);
  const normalized = markdownUrl?.[2] ?? raw;

  // The API sometimes returns an absolute URL and sometimes only a path such
  // as `/uploads/...`. Relative paths must point to the API host, not Vercel.
  try {
    return new URL(
      normalized,
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.dedepos.com"
    ).toString();
  } catch {
    return null;
  }
}

export function parseDocumentImage(json: any): DocumentImage {
  const rawImageUrl =
    json?.imageuri ??
    json?.imageurl ??
    json?.imageUrl ??
    json?.image_url ??
    json?.fileurl ??
    json?.fileUrl ??
    json?.file_url ??
    json?.filepath ??
    json?.filePath ??
    json?.path ??
    json?.url;

  return {
    imageId:
      json?.documentimageguid?.toString() ??
      json?.documentImageGuid?.toString() ??
      json?.imageid?.toString() ??
      json?.guidfixed?.toString() ??
      null,
    shopId: json?.shopid?.toString() ?? json?.guidfixedid?.toString() ?? null,
    category: json?.category?.toString() ?? null,
    subcategory: json?.subcategory?.toString() ?? null,
    description: json?.description?.toString() ?? json?.name?.toString() ?? null,
    uploadedAt: json?.uploadedat?.toString() ?? json?.uploadedAt?.toString() ?? json?.uploaded_at?.toString() ?? json?.metafileat?.toString() ?? null,
    uploadedBy: json?.uploadedby?.toString() ?? json?.uploadedBy?.toString() ?? json?.uploaded_by?.toString() ?? null,
    imageUrl: resolveDocumentImageUrl(rawImageUrl),
    ocrAnalyzed: hasOcrAnalysis(json?.ocranalyzeai ?? json?.ocrAnalyzeAi ?? json?.ocrAnalyzeAI),
  };
}
