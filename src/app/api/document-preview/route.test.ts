import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const createRequest = (documentUrl: string, token?: string) =>
  new NextRequest(
    `http://localhost/api/document-preview?url=${encodeURIComponent(documentUrl)}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );

describe("GET /api/document-preview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects files from a different Azure Blob account", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("pdf", { status: 200 }));

    const response = await GET(
      createRequest("https://another-account.blob.core.windows.net/file.pdf")
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires the current application token", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("pdf", { status: 200 }));

    const response = await GET(
      createRequest(
        "https://dedeposblosstorage.blob.core.windows.net/documents/report.pdf"
      )
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a token when the API returns an unsuccessful response", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 200 })
      );

    const response = await GET(
      createRequest(
        "https://dedeposblosstorage.blob.core.windows.net/documents/report.pdf",
        "invalid-token"
      )
    );

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("validates the token without forwarding it to Azure Blob", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response("pdf", {
          status: 200,
          headers: { "content-type": "application/pdf" },
        })
      );

    const response = await GET(
      createRequest(
        "https://dedeposblosstorage.blob.core.windows.net/documents/report.pdf",
        "valid-token"
      )
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const validationHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    const blobHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers);
    expect(validationHeaders.get("authorization")).toBe("Bearer valid-token");
    expect(blobHeaders.has("authorization")).toBe(false);
  });
});
