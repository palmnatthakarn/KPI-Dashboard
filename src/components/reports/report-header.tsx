"use client";

import { Maximize2, FileText, Table as TableIcon } from "lucide-react";
import { formatThaiDate } from "@/lib/utils";

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
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xl font-bold tracking-tight text-foreground">ตัวอย่างรายงาน (Preview)</p>
        {startDate && endDate && (
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            ข้อมูล ณ วันที่ {formatThaiDate(startDate)} - {formatThaiDate(endDate)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onFullScreen}
          title="Full Screen"
          className="rounded-md p-2 text-muted-foreground hover:bg-accent"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
        <ExportButton label="PDF" icon={FileText} color="#EF4444" onClick={() => onExport("PDF")} />
        <ExportButton label="Excel" icon={TableIcon} color="#10B981" onClick={() => onExport("Excel")} />
      </div>
    </div>
  );
}

function ExportButton({
  label,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  icon: typeof FileText;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold"
      style={{ color, borderColor: `${color}33`, backgroundColor: `${color}1A` }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
