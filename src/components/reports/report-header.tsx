"use client";

import { Maximize2, FileText, Table as TableIcon } from "lucide-react";
import { formatThaiDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

/** Ported from ReportHeader (report_header.dart). */
export function ReportHeader({
  startDate,
  endDate,
  onFullScreen,
  onExport,
}: {
  startDate: string | null;
  endDate: string | null;
  onFullScreen: () => void;
  onExport: (type: "PDF" | "Excel") => void;
}) {
  return (
    <PageHeader
      title="ตัวอย่างรายงาน (Preview)"
      description={
        startDate && endDate
          ? `ข้อมูล ณ วันที่ ${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`
          : undefined
      }
      actions={
        <>
          <button
            onClick={onFullScreen}
            title="Full Screen"
            aria-label="แสดงเต็มหน้าจอ"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <ExportButton
            label="PDF"
            icon={FileText}
            className="bg-status-exceeded-soft text-status-exceeded-strong"
            onClick={() => onExport("PDF")}
          />
          <ExportButton
            label="Excel"
            icon={TableIcon}
            className="bg-status-safe-soft text-status-safe-strong"
            onClick={() => onExport("Excel")}
          />
        </>
      }
    />
  );
}

function ExportButton({
  label,
  icon: Icon,
  className,
  onClick,
}: {
  label: string;
  icon: typeof FileText;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
