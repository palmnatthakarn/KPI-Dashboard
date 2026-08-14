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

export function parseDocumentImage(json: any): DocumentImage {
  return {
    imageId: json?.imageid?.toString() ?? json?.guidfixed?.toString() ?? null,
    shopId: json?.shopid?.toString() ?? json?.guidfixedid?.toString() ?? null,
    category: json?.category?.toString() ?? null,
    subcategory: json?.subcategory?.toString() ?? null,
    description: json?.description?.toString() ?? json?.name?.toString() ?? null,
    uploadedAt: json?.uploadedat?.toString() ?? json?.uploadedAt?.toString() ?? json?.uploaded_at?.toString() ?? json?.metafileat?.toString() ?? null,
    uploadedBy: json?.uploadedby?.toString() ?? json?.uploadedBy?.toString() ?? json?.uploaded_by?.toString() ?? null,
    imageUrl: json?.imageuri?.toString() ?? json?.imageurl?.toString() ?? json?.imageUrl?.toString() ?? json?.image_url?.toString() ?? null,
  };
}
