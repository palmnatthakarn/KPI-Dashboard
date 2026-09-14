import type { NextRequest } from "next/server";

const DOCUMENT_HOST = "dedeposblosstorage.blob.core.windows.net";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.dedepos.com";

function isAllowedDocumentUrl(value: URL): boolean {
  return (
    value.protocol === "https:" &&
    value.hostname === DOCUMENT_HOST &&
    value.port === "" &&
    value.username === "" &&
    value.password === ""
  );
}

function getBearerAuthorization(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization")?.trim();
  return authorization && /^Bearer\s+\S+$/i.test(authorization)
    ? authorization
    : null;
}

async function validateSession(authorization: string): Promise<Response> {
  try {
    const response = await fetch(
      `${API_BASE_URL.replace(/\/$/, "")}/list-shop?limit=1`,
      {
        cache: "no-store",
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(10_000),
      }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success !== true) {
      return new Response("Unauthorized", { status: 401 });
    }

    return new Response(null, { status: 204 });
  } catch {
    return new Response("Unable to validate session", { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");
  if (!source) return new Response("Missing document URL", { status: 400 });

  let documentUrl: URL;
  try {
    documentUrl = new URL(source);
  } catch {
    return new Response("Invalid document URL", { status: 400 });
  }

  if (!isAllowedDocumentUrl(documentUrl)) {
    return new Response("Document host is not allowed", { status: 403 });
  }

  const authorization = getBearerAuthorization(request);
  if (!authorization) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionResponse = await validateSession(authorization);
  if (!sessionResponse.ok) return sessionResponse;

  const range = request.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(documentUrl, {
      cache: "no-store",
      headers: range ? { range } : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return new Response("Unable to load document", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Unable to load document", {
      status: upstream.status || 502,
    });
  }

  const headers = new Headers();
  const isPdf = documentUrl.pathname.toLowerCase().endsWith(".pdf");
  headers.set(
    "Content-Type",
    isPdf
      ? "application/pdf"
      : (upstream.headers.get("content-type") ?? "application/octet-stream")
  );
  headers.set(
    "Content-Disposition",
    isPdf ? "inline; filename=preview.pdf" : "inline"
  );
  headers.set("Cache-Control", "private, max-age=300");
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") ?? "bytes");
  headers.set("X-Content-Type-Options", "nosniff");

  for (const name of [
    "content-length",
    "content-range",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
