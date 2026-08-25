"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Edit3, FileText, Loader2, Search, Users } from "lucide-react";
import { KpiFilterBar } from "@/components/kpi/kpi-filter-bar";
import { getDisplayName, useEmployeeMappings } from "@/lib/employee/employee-mapping-service";
import { useKpiCombined } from "@/hooks/use-kpi-combined";
import { formatThaiDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { journalCountTotal, type KpiCombinedEmployee, type KpiCombinedJournalItem, type KpiCombinedShopStat } from "@/types/kpi-combined";

const PAGE_SIZES = [10, 20, 50];
const FONT_SCALES = [0.85, 1, 1.15];

export default function KpiJournalPage() {
  useEmployeeMappings();
  const data = useKpiCombined();
  const username = useAuthStore((state) => state.username);
  const [fontScale, setFontScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const summary = useMemo(() => data.filteredEmployees.reduce((total, employee) => ({
    documents: total.documents + employee.journalRequiredDocs,
    journals: total.journals + employee.totalJournals + employee.totalJournalsNoPhoto,
    employees: total.employees + 1,
  }), { documents: 0, journals: 0, employees: 0 }), [data.filteredEmployees]);

  async function handleExport() {
    if (isExporting || data.filteredEmployees.length === 0) return;
    setIsExporting(true);
    setToast("กำลังสร้างไฟล์ PDF...");
    try {
      const { exportKpiPdf } = await import("@/lib/kpi/kpi-pdf-export");
      await exportKpiPdf({ employees: data.filteredEmployees, startDate: data.filters.startDate, endDate: data.filters.endDate, userName: username ?? "ผู้ใช้งาน" });
      setToast("ส่งออก PDF สำเร็จ");
    } catch (error) {
      console.error("Unable to export KPI journal PDF", error);
      setToast("สร้าง PDF ไม่สำเร็จ");
    } finally {
      setIsExporting(false);
      window.setTimeout(() => setToast(null), 2500);
    }
  }

  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><Edit3 className="h-5 w-5 text-indigo-500" /><h1 className="text-lg font-semibold">KPI — บันทึกบัญชี</h1></div><p className="mt-1 text-sm text-muted-foreground">สรุปการคีย์ ตรวจสอบ และแก้ไขรายการบัญชี แยกตามพนักงานและร้าน</p></div>
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">{FONT_SCALES.map((scale) => <button key={scale} type="button" onClick={() => setFontScale(scale)} className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", fontScale === scale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>{scale}x</button>)}</div>
    </header>
    <KpiFilterBar employeeItems={data.employeeNames.map((name) => ({ id: name, label: getDisplayName(name) }))} shops={data.shops} shopIds={data.filters.shopIds} employeeNames={data.filters.employeeNames} startDate={data.filters.startDate} endDate={data.filters.endDate} isSearching={data.isFetching} canExport={data.hasSearched && !data.isLoading && !data.isError && !isExporting && data.filteredEmployees.length > 0} onSearch={data.applyFilters} onReset={data.resetFilters} onExport={handleExport} />
    {data.hasSearched ? <>
      <p className="text-xs text-muted-foreground">ข้อมูลสถิติ ณ วันที่ {formatThaiDate(data.filters.startDate)} - {formatThaiDate(data.filters.endDate)}</p>
      <div className="grid gap-3 sm:grid-cols-3"><SummaryCard icon={FileText} title="เอกสารที่ต้องบันทึก" value={summary.documents} tone="indigo" /><SummaryCard icon={Edit3} title="รายการบันทึกบัญชีทั้งหมด" value={summary.journals} tone="emerald" /><SummaryCard icon={Users} title="จำนวนพนักงานทั้งหมด" value={summary.employees} suffix=" คน" tone="amber" /></div>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {data.incompleteShops.length > 0 ? <div className="flex items-center gap-2 border-b border-border bg-status-warning-soft px-4 py-2 text-xs text-status-warning-strong"><AlertTriangle className="h-4 w-4" />โหลดข้อมูลไม่ครบสำหรับร้าน: {data.incompleteShops.join(", ")} — ลองกดค้นหาอีกครั้ง</div> : null}
        {data.isLoading ? <State icon={<Loader2 className="h-6 w-6 animate-spin" />} text="กำลังโหลดข้อมูล KPI บันทึกบัญชี..." /> : data.isError ? <div className="flex flex-col items-center gap-3 py-20 text-center"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-sm font-semibold">โหลดข้อมูลไม่สำเร็จ</p><p className="text-xs text-muted-foreground">{data.error instanceof Error ? data.error.message : "เกิดข้อผิดพลาด"}</p><button type="button" onClick={data.refresh} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">ลองใหม่</button></div> : <JournalTable employees={data.filteredEmployees} fontScale={fontScale} />}
      </section>
    </> : <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center"><div className="mb-4 rounded-full bg-indigo-50 p-4 dark:bg-indigo-950/40"><Search className="h-7 w-7 text-indigo-500" /></div><p className="text-base font-bold">เลือกช่วงวันที่แล้วกดค้นหาเพื่อดู KPI บันทึกบัญชี</p><p className="mt-1.5 text-xs text-muted-foreground">สามารถกรองตามพนักงานและร้านก่อนแสดงผลได้</p></div>}
    {toast ? <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-lg">{toast.includes("สำเร็จ") ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className={cn("h-4 w-4", isExporting && "animate-spin")} />}{toast}</div> : null}
  </div>;
}

function SummaryCard({ icon: Icon, title, value, suffix = "", tone }: { icon: typeof FileText; title: string; value: number; suffix?: string; tone: "indigo" | "emerald" | "amber" }) {
  const colors = { indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40", emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40" };
  return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"><div className={cn("rounded-xl p-2.5", colors[tone])}><Icon className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-0.5 text-xl font-bold tabular-nums">{value.toLocaleString("th-TH")}{suffix}</p></div></div>;
}
function State({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">{icon}{text}</div>; }

function JournalTable({ employees, fontScale }: { employees: KpiCombinedEmployee[]; fontScale: number }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageCount = Math.max(1, Math.ceil(employees.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const shown = employees.slice((safePage - 1) * pageSize, safePage * pageSize);
  function toggle(key: string) { setExpanded((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }
  if (employees.length === 0) return <State icon={<Search className="h-6 w-6" />} text="ไม่พบข้อมูลตามตัวกรองที่เลือก" />;
  return <><div className="overflow-x-auto" style={{ fontSize: `${fontScale}rem` }}><table className="w-full min-w-[760px] border-collapse text-xs"><thead className="bg-secondary/70 text-muted-foreground"><tr><th className="px-4 py-3 text-left">พนักงาน / ร้าน / เอกสาร</th><th className="w-32 px-3 py-3">ต้องบันทึก</th><th className="w-28 bg-indigo-50/70 px-3 py-3 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">คีย์</th><th className="w-28 bg-emerald-50/70 px-3 py-3 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">ตรวจสอบ</th><th className="w-28 bg-amber-50/70 px-3 py-3 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">แก้ไข</th><th className="w-12" /></tr></thead><tbody>{shown.map((employee, index) => <EmployeeRows key={employee.name} employee={employee} index={index} expanded={expanded} toggle={toggle} />)}</tbody></table></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground"><label className="flex items-center gap-2">แถวต่อหน้า<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-border bg-card px-2 py-1 text-foreground">{PAGE_SIZES.map((size) => <option key={size}>{size}</option>)}</select></label><div className="flex items-center gap-2"><span>{employees.length.toLocaleString("th-TH")} รายการ · หน้า {safePage}/{pageCount}</span><PageButton label="หน้าก่อนหน้า" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></PageButton><PageButton label="หน้าถัดไป" disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight className="h-4 w-4" /></PageButton></div></div></>;
}
function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="rounded-lg border border-border p-1.5 disabled:opacity-30">{children}</button>; }

function EmployeeRows({ employee, index, expanded, toggle }: { employee: KpiCombinedEmployee; index: number; expanded: Set<string>; toggle: (key: string) => void }) {
  const open = expanded.has(employee.name); const displayName = getDisplayName(employee.name);
  return <><MetricRow label={<div><p className="font-semibold text-foreground">{displayName}</p>{displayName !== employee.name ? <p className="text-[10px] text-muted-foreground">({employee.name})</p> : null}</div>} rowClass={index % 2 ? "bg-secondary/25" : "bg-card"} document={employee.journalRequiredDocs} keyed={employee.totalJournals + employee.totalJournalsNoPhoto} checked={employee.totalChecked} updated={employee.totalUpdated} open={open} onClick={() => toggle(employee.name)} />{open ? employee.shopStats.map((shop, shopIndex) => <ShopRows key={shop.shopName} employeeName={employee.name} shop={shop} isLast={shopIndex === employee.shopStats.length - 1} expanded={expanded} toggle={toggle} />) : null}</>;
}
function ShopRows({ employeeName, shop, isLast, expanded, toggle }: { employeeName: string; shop: KpiCombinedShopStat; isLast: boolean; expanded: Set<string>; toggle: (key: string) => void }) {
  const key = `${employeeName}::${shop.shopName}`; const open = expanded.has(key);
  const details = shop.tasks.flatMap((task) => task.journalEntries.map((journal) => ({ journal, taskName: task.taskName }))).concat(shop.orphanJournalEntries.map((journal) => ({ journal, taskName: "ไม่ได้ผูกกับงาน" })));
  return <><MetricRow label={<span className="pl-6 font-medium"><span className="mr-2 text-border">{isLast ? "└" : "├"}─</span>{shop.shopName}</span>} rowClass="bg-secondary/15" document={shop.journalRequiredDocs} keyed={journalCountTotal(shop)} checked={shop.journalChecked} updated={shop.journalUpdated} open={open} onClick={() => toggle(key)} />{open ? details.slice(0, 200).map(({ journal, taskName }, index) => <DetailRow key={`${journal.docNo}-${index}`} journal={journal} taskName={taskName} employeeName={employeeName} />) : null}</>;
}
function MetricRow({ label, rowClass, document, keyed, checked, updated, open, onClick }: { label: React.ReactNode; rowClass: string; document: number; keyed: number; checked: number; updated: number; open: boolean; onClick: () => void }) { return <tr className={cn("cursor-pointer border-t border-border/70 transition-colors hover:bg-accent/50", rowClass)} onClick={onClick}><td className="px-4 py-3">{label}</td><NumberCell value={document} /><NumberCell value={keyed} className="text-indigo-600" /><NumberCell value={checked} className="text-emerald-600" /><NumberCell value={updated} className="text-amber-600" /><td><ChevronDown className={cn("mx-auto h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} /></td></tr>; }
function NumberCell({ value, className }: { value: number; className?: string }) { return <td className={cn("px-3 py-3 text-center font-semibold tabular-nums", className)}>{value.toLocaleString("th-TH")}</td>; }
function DetailRow({ journal, taskName, employeeName }: { journal: KpiCombinedJournalItem; taskName: string; employeeName: string }) { return <tr className="border-t border-border/50 bg-card text-[11px]"><td className="py-2 pl-16 pr-4"><div className="flex gap-2"><span className="text-border">└─</span><span className="truncate font-medium text-blue-600">{journal.docNo || "—"}</span></div><p className="truncate pl-7 text-[10px] text-muted-foreground">{formatDate(journal.keyedAt ?? journal.docDate)} · {taskName}</p></td><td /><Dot active={journal.createdBy === employeeName} color="bg-indigo-500" title={formatDateTime(journal.keyedAt)} /><Dot active={journal.checkedBy === employeeName} color="bg-emerald-500" title={journal.checkedBy} /><Dot active={journal.updatedBy === employeeName} color="bg-amber-500" title={journal.updatedBy} /><td /></tr>; }
function Dot({ active, color, title }: { active: boolean; color: string; title: string }) { return <td className="text-center">{active ? <span title={title} className={cn("mx-auto block h-2.5 w-2.5 rounded-full", color)} /> : null}</td>; }
function formatDate(date: Date | null) { return date ? new Intl.DateTimeFormat("th-TH", { dateStyle: "short" }).format(date) : "—"; }
function formatDateTime(date: Date | null) { return date ? new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(date) : ""; }
