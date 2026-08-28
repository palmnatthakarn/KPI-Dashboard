"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/api/pdf-worker";

const PDF_OPTIONS = {
  disableRange: true,
  disableStream: true,
};

export function PdfPreview({ url, zoom }: { url: string; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(800);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setPageWidth(Math.max(280, Math.min(900, container.clientWidth - 32)));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const previewUrl = `/api/document-preview?url=${encodeURIComponent(url)}`;

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto rounded-lg bg-neutral-200 p-4">
      <Document
        file={previewUrl}
        options={PDF_OPTIONS}
        onLoadSuccess={({ numPages: total }) => {
          setLoadError("");
          setNumPages(total);
        }}
        onLoadError={(error) => setLoadError(error.message)}
        loading={<p className="py-12 text-center text-sm text-neutral-600">กำลังโหลด PDF...</p>}
        error={
          <div className="py-12 text-center text-sm text-red-700">
            <p>ไม่สามารถแสดงตัวอย่าง PDF ได้</p>
            {loadError && <p className="mt-2 text-xs text-red-600">{loadError}</p>}
          </div>
        }
        className="flex flex-col items-center gap-4"
      >
        {Array.from({ length: numPages }, (_, index) => (
          <div key={index + 1} className="overflow-hidden bg-white shadow">
            <Page
              pageNumber={index + 1}
              width={pageWidth}
              scale={zoom}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={<div className="h-96 w-full animate-pulse bg-white" />}
            />
            <p className="border-t bg-white py-1.5 text-center text-xs text-neutral-500">
              หน้า {index + 1} / {numPages}
            </p>
          </div>
        ))}
      </Document>
    </div>
  );
}
