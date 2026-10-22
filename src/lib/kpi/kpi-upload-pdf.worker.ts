/// <reference lib="webworker" />
import { renderUploadPdf, type UploadPdfInput } from "@/lib/kpi/kpi-upload-pdf-document";

/** Renders the upload report off the main thread so the page stays responsive. */
self.onmessage = async (event: MessageEvent<{ input: UploadPdfInput; fontBaseUrl: string }>) => {
  try {
    const blob = await renderUploadPdf(event.data.input, event.data.fontBaseUrl);
    self.postMessage({ ok: true, blob });
  } catch (error) {
    self.postMessage({ ok: false, message: error instanceof Error ? error.message : String(error) });
  }
};
