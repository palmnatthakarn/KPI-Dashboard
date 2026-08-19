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
}

function resolveDocumentImageUrl(value: unknown): string | null {
  const raw = value?.toString().trim();
  if (!raw) return null;

  // The API sometimes returns an absolute URL and sometimes only a path such
  // as `/uploads/...`. Relative paths must point to the API host, not Vercel.
  try {
    return new URL(
      raw,
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
    imageId: json?.imageid?.toString() ?? json?.guidfixed?.toString() ?? null,
    shopId: json?.shopid?.toString() ?? json?.guidfixedid?.toString() ?? null,
    category: json?.category?.toString() ?? null,
    subcategory: json?.subcategory?.toString() ?? null,
    description: json?.description?.toString() ?? json?.name?.toString() ?? null,
    uploadedAt: json?.uploadedat?.toString() ?? json?.uploadedAt?.toString() ?? json?.uploaded_at?.toString() ?? json?.metafileat?.toString() ?? null,
    uploadedBy: json?.uploadedby?.toString() ?? json?.uploadedBy?.toString() ?? json?.uploaded_by?.toString() ?? null,
    imageUrl: resolveDocumentImageUrl(rawImageUrl),
  };
}
