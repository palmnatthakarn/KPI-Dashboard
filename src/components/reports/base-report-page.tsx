"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { ReportFilterSection } from "@/components/reports/report-filter-section";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportEmptyState } from "@/components/reports/report-empty-state";
import { GenericReportTable } from "@/components/reports/generic-report-table";
import { getReportTableData, UNIMPLEMENTED_REPORT_TYPES } from "@/lib/reports/report-data";
import { listShops } from "@/lib/api/multi-shop-service";
import type { ReportQuery, ReportTableData } from "@/types/report";

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
  dataLoader,
}: {
  title: string;
  reportTypes: string[];
  defaultReportType?: string;
  dataLoader?: (query: ReportQuery) => Promise<ReportTableData>;
}) {
  const [selectedReportType, setSelectedReportType] = useState<string | null>(defaultReportType ?? null);
  const [startDate, setStartDate] = useState<string | null>(firstOfMonthISO());
  const [endDate, setEndDate] = useState<string | null>(toISODate(new Date()));
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [appliedReportType, setAppliedReportType] = useState<string | null>(null);
  const [tableData, setTableData] = useState<ReportTableData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.variant === "loading" ? 1500 : 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!dataLoader) return;
    let active = true;
    listShops().then((items) => {
      if (!active) return;
      const parsed = items.map((shop) => {
        const id = String(shop.shopid ?? shop.shop_id ?? shop.id ?? "");
        const names = Array.isArray(shop.names) ? shop.names as { code?: string; name?: string }[] : [];
        const localized = names.find((name) => name.code === "th") ?? names[0];
        return { id, name: localized?.name ?? String(shop.shopname ?? shop.shop_name ?? id) };
      }).filter((shop) => shop.id);
      setShops(parsed);
      if (parsed.length === 1) setSelectedShopId(parsed[0].id);
    });
    return () => { active = false; };
  }, [dataLoader]);

  async function applySearch() {
    if (!selectedReportType) return setToast({ message: "กรุณาเลือกประเภทรายงาน", variant: "error" });
    if (startDate && endDate && startDate > endDate) return setToast({ message: "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด", variant: "error" });
    if (!dataLoader) {
      setAppliedReportType(selectedReportType);
      setTableData(getReportTableData(selectedReportType));
      return;
    }
    if (!selectedShopId) return setToast({ message: "กรุณาเลือกร้านก่อนค้นหารายงาน", variant: "error" });
    setLoading(true);
    setAppliedReportType(selectedReportType);
    try {
      const result = await dataLoader({ reportType: selectedReportType, shopId: selectedShopId, startDate: startDate ?? "", endDate: endDate ?? "" });
      setTableData(result);
    } catch (error) {
      setTableData(null);
      setToast({ message: error instanceof Error ? error.message : "โหลดรายงานไม่สำเร็จ", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(type: "PDF" | "Excel") {
    if (type === "PDF" && appliedReportType) {
      const data = tableData;
      if (data) {
        setToast({ message: "กำลังสร้างไฟล์ PDF...", variant: "loading" });
        try {
          const { exportTablePdf } = await import("@/lib/reports/table-pdf-export");
          await exportTablePdf({
            title: appliedReportType,
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

  const isUnimplemented = !!appliedReportType && UNIMPLEMENTED_REPORT_TYPES.has(appliedReportType);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <ReportFilterSection
        reportTypes={reportTypes}
        shops={dataLoader ? shops : undefined}
        selectedShopId={selectedShopId}
        selectedReportType={selectedReportType}
        startDate={startDate}
        endDate={endDate}
        onReportTypeChange={setSelectedReportType}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onShopChange={setSelectedShopId}
        onSearch={applySearch}
        isLoadingShops={!!dataLoader && shops.length === 0}
      />

      {appliedReportType ? (
        <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
          <ReportHeader
            startDate={startDate}
            endDate={endDate}
            onFullScreen={() => setFullscreen(true)}
            onExport={handleExport}
          />
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />กำลังโหลดรายงาน...</div>
          ) : tableData && tableData.rows.length > 0 ? (
            <GenericReportTable {...tableData} />
          ) : tableData ? (
            <p className="py-10 text-center text-sm text-muted-foreground">ไม่พบข้อมูลในเงื่อนไขที่เลือก</p>
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
              <Dialog.Title className="text-base font-semibold">{appliedReportType}</Dialog.Title>
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
