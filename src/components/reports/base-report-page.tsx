"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { ReportFilterSection } from "@/components/reports/report-filter-section";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportEmptyState } from "@/components/reports/report-empty-state";
import { GenericReportTable } from "@/components/reports/generic-report-table";
import { getReportTableData, UNIMPLEMENTED_REPORT_TYPES } from "@/lib/reports/report-data";

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstOfMonthISO() {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
}

interface Toast {
  message: string;
  variant: "loading" | "success" | "error";
}

/**
 * Reusable report page shell, ported from BaseReportPage
 * (base_report_page.dart) — also covers what payables_page.dart,
 * receivables_page.dart and inventory_page.dart implemented as near-duplicate
 * StatefulWidgets, since they use the exact same filter/header/table/empty
 * components with only the title + reportTypes list differing.
 *
 * Report content is mock/preview data in the original app too (see
 * lib/services/report_data_provider.dart + report_content.dart) — none of
 * these are wired to a real backend endpoint yet.
 */
export function BaseReportPage({
  title,
  reportTypes,
  defaultReportType,
}: {
  title: string;
  reportTypes: string[];
  defaultReportType?: string;
}) {
  const [selectedReportType, setSelectedReportType] = useState<string | null>(defaultReportType ?? null);
  const [startDate, setStartDate] = useState<string | null>(firstOfMonthISO());
  const [endDate, setEndDate] = useState<string | null>(toISODate(new Date()));
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.variant === "loading" ? 1500 : 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleExport(type: "PDF" | "Excel") {
    if (type === "PDF" && selectedReportType) {
      const data = getReportTableData(selectedReportType);
      if (data) {
        setToast({ message: "กำลังสร้างไฟล์ PDF...", variant: "loading" });
        try {
          const { exportTablePdf } = await import("@/lib/reports/table-pdf-export");
          await exportTablePdf({
            title: selectedReportType,
            subtitle: `ช่วงวันที่ ${startDate ?? "-"} ถึง ${endDate ?? "-"}`,
            table: data,
          });
          setToast({ message: "ดาวน์โหลดรายงาน PDF สำเร็จ", variant: "success" });
        } catch (error) {
          console.error("Unable to export report PDF", error);
          setToast({ message: "สร้างไฟล์ PDF ไม่สำเร็จ", variant: "error" });
        }
        return;
      }
    }
    setToast({ message: `กำลังดาวน์โหลดรายงาน ${type}...`, variant: "success" });
  }

  const tableData = selectedReportType ? getReportTableData(selectedReportType) : null;
  const isUnimplemented = !!selectedReportType && UNIMPLEMENTED_REPORT_TYPES.has(selectedReportType);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <ReportFilterSection
        reportTypes={reportTypes}
        selectedReportType={selectedReportType}
        startDate={startDate}
        endDate={endDate}
        onReportTypeChange={setSelectedReportType}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {selectedReportType ? (
        <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
          <ReportHeader
            startDate={startDate}
            endDate={endDate}
            onFullScreen={() => setFullscreen(true)}
            onExport={handleExport}
          />
          {tableData ? (
            <GenericReportTable {...tableData} />
          ) : isUnimplemented ? (
            <p className="py-10 text-center text-sm text-muted-foreground">รายงานนี้อยู่ระหว่างพัฒนา</p>
          ) : null}
        </div>
      ) : (
        <ReportEmptyState />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-lg">
          {toast.variant === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : toast.variant === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      <Dialog.Root open={fullscreen} onOpenChange={setFullscreen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed inset-0 z-50 overflow-y-auto bg-background">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <Dialog.Title className="text-base font-semibold">{selectedReportType}</Dialog.Title>
              <Dialog.Close className="rounded-md p-1.5 hover:bg-accent">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <div className="p-6">{tableData && <GenericReportTable {...tableData} />}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
