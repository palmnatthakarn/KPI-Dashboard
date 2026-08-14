"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, Search } from "lucide-react";
import { useKpiCombined } from "@/hooks/use-kpi-combined";
import { KpiSummaryCards } from "@/components/kpi/kpi-summary-cards";
import { KpiFilterBar } from "@/components/kpi/kpi-filter-bar";
import { KpiTable } from "@/components/kpi/kpi-table";
import { getDisplayName } from "@/lib/employee/employee-mapping-service";
import { useAuthStore } from "@/store/auth-store";

const FONT_SCALES = [1, 1.2, 1.4];

/** Ported from KpiCombinedPage (kpi_combined_page.dart) — the single reachable "KPI" nav item. */
export default function KpiPage() {
  const {
    filters,
    applyFilters,
    resetFilters,
    refresh,
    hasSearched,
    shops,
    employeeNames: allEmployeeNames,
    filteredEmployees,
    summary,
    isLoading,
    isFetching,
    isError,
    error,
    incompleteShops,
  } = useKpiCombined();

  const [fontScale, setFontScale] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const username = useAuthStore((state) => state.username);

  const employeeItems = allEmployeeNames.map((name) => ({ id: name, label: getDisplayName(name) }));

  async function handleExport() {
    if (!hasSearched || filteredEmployees.length === 0) return;
    setToast("กำลังสร้างไฟล์ PDF...");
    try {
      const { exportKpiPdf } = await import("@/lib/kpi/kpi-pdf-export");
      await exportKpiPdf({
        employees: filteredEmployees,
        startDate: filters.startDate,
        endDate: filters.endDate,
        userName: username ?? "ผู้ใช้งาน",
      });
      setToast("ส่งออก PDF สำเร็จ");
    } catch (exportError) {
      console.error("Unable to export KPI PDF", exportError);
      setToast("สร้าง PDF ไม่สำเร็จ");
    } finally {
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">KPI</h1>
          <p className="text-sm text-muted-foreground">สรุปผลงานพนักงานตามงาน (task) และการบันทึกบัญชี (GL)</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white p-1">
          {FONT_SCALES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFontScale(s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                fontScale === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <KpiFilterBar
        employeeItems={employeeItems}
        shops={shops}
        shopIds={filters.shopIds}
        employeeNames={filters.employeeNames}
        startDate={filters.startDate}
        endDate={filters.endDate}
        isSearching={isFetching}
        canExport={hasSearched && !isLoading && !isError && filteredEmployees.length > 0}
        onSearch={applyFilters}
        onReset={resetFilters}
        onExport={handleExport}
      />

      {hasSearched ? (
        <>
          <KpiSummaryCards
            totalDocuments={summary.totalDocuments}
            totalUploaded={summary.totalUploaded}
            remainingDocuments={summary.remainingDocuments}
            waitingVerify={summary.waitingVerify}
            requiredToRecordDocuments={summary.requiredToRecordDocuments}
            totalJournalsCombined={summary.totalJournalsCombined}
            ready={!isLoading}
          />

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#DCFCE7" }} /> เอกสาร (ต้องบันทึก(งาน) — จากสถานะงาน /task)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#E0E7FF" }} /> บันทึกบัญชี (คีย์ — จาก GL journal)
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#EA580C]">
          ● ตัวเลขสีส้ม = บริบทของงานที่ร่วมคีย์ ไม่ถูกนับเข้า total
        </span>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังโหลดข้อมูล KPI...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium">โหลดข้อมูลไม่สำเร็จ</p>
            <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : "เกิดข้อผิดพลาด"}</p>
            <button type="button" onClick={refresh} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              ลองใหม่
            </button>
          </div>
        ) : (
          <>
            {incompleteShops.length > 0 && (
              <div className="flex items-center gap-2 border-b border-[#F1F5F9] bg-[#FFFBEB] px-4 py-2 text-[11px] text-[#B45309]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                โหลดข้อมูลไม่ครบสำหรับร้าน: {incompleteShops.join(", ")} — ลองกดค้นหาอีกครั้ง
              </div>
            )}
            <KpiTable employees={filteredEmployees} fontScale={fontScale} />
          </>
        )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white px-6 py-12 text-center">
          <div className="mb-4 rounded-full bg-blue-50 p-4">
            <Search className="h-7 w-7 text-blue-500" />
          </div>
          <p className="text-base font-extrabold text-slate-800">เลือกช่วงวันที่แล้วกดค้นหาเพื่อดู KPI</p>
          <p className="mt-1.5 text-xs text-muted-foreground">ระบบจะโหลดเฉพาะข้อมูลตามตัวกรองที่เลือก เพื่อให้เปิดหน้าได้เร็วขึ้น</p>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-lg">
          {toast.includes("สำเร็จ") ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          {toast}
        </div>
      )}
    </div>
  );
}
