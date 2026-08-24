"use client";

import { useState, type ReactNode } from "react";
import { BriefcaseBusiness, ChevronDown, ChevronRight, Inbox, ImageUp, Store, User, Users } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";
import { Pagination } from "@/components/common/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiColors, KpiDimensions } from "@/lib/kpi/kpi-constants";
import { getDisplayName, useEmployeeMappings } from "@/lib/employee/employee-mapping-service";
import type { KpiCombinedEmployee, KpiCombinedShopStat, KpiCombinedTaskItem } from "@/types/kpi-combined";

const NUMERIC_COL_MIN_WIDTH = 72;
const GRID_MIN_WIDTH =
  KpiDimensions.nameColWidth +
  KpiDimensions.numColCount * NUMERIC_COL_MIN_WIDTH +
  KpiDimensions.expandColWidth;
const GRID_TEMPLATE = `minmax(${KpiDimensions.nameColWidth}px,1.35fr) repeat(${KpiDimensions.numColCount}, minmax(${NUMERIC_COL_MIN_WIDTH}px, 1fr)) ${KpiDimensions.expandColWidth}px`;

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "รอคีย์", color: KpiColors.waitingKey },
  1: { label: "ผ่าน", color: KpiColors.completed },
  2: { label: "ไม่ผ่าน", color: KpiColors.cancelled },
  3: { label: "ไม่บันทึก", color: KpiColors.waitingFix },
  4: { label: "เสร็จ", color: KpiColors.completed },
  6: { label: "ไม่ต้องอนุมัติ", color: KpiColors.assigned },
};

function numCell(value: number, bg?: string) {
  const isZero = value === 0;
  return (
    <div
      className={`flex h-full items-center justify-center border-l border-border text-[12px] font-semibold tabular-nums ${
        isZero ? "text-muted-foreground/60" : "text-foreground"
      }`}
      style={{ backgroundColor: bg }}
    >
      {isZero ? "—" : value.toLocaleString("th-TH")}
    </div>
  );
}

function dashCell(bg?: string) {
  return (
    <div className="flex h-full items-center justify-center border-l border-border text-[12px] tabular-nums text-muted-foreground/60" style={{ backgroundColor: bg }}>
      —
    </div>
  );
}

/** Numeric columns shared by employee/shop rows (15 total). */
function numericColumns(stats: {
  waitingVerify: number;
  passed: number;
  cancelled: number;
  notRecorded: number;
  notRequiredApproval: number;
  requiredToRecord: number;
  recorded: number;
  remaining: number;
  completed: number;
  journalCount: number;
  journalCountNoPhoto: number;
  journalChecked: number;
  journalUpdated: number;
}) {
  return (
    <>
      {numCell(stats.waitingVerify)}
      {numCell(stats.passed)}
      {numCell(stats.cancelled)}
      {numCell(stats.notRecorded)}
      {numCell(stats.notRequiredApproval)}
      {numCell(stats.requiredToRecord)}
      {numCell(stats.recorded)}
      {numCell(stats.remaining)}
      {numCell(stats.completed)}
      {numCell(stats.journalCount)}
      {numCell(stats.journalCountNoPhoto)}
      {numCell(stats.journalCount + stats.journalCountNoPhoto)}
      {numCell(stats.journalChecked)}
      {numCell(stats.journalUpdated)}
    </>
  );
}

function journalStatsForTask(task: KpiCombinedTaskItem) {
  const journalCountNoPhoto = task.journalEntries.filter((journal) => !journal.documentRef && !journal.jobGuidfixed).length;
  return {
    journalCount: task.journalEntries.length - journalCountNoPhoto,
    journalCountNoPhoto,
    journalChecked: task.journalEntries.filter((journal) => journal.checkedBy).length,
    journalUpdated: task.journalEntries.filter((journal) => journal.updatedBy).length,
  };
}

const GROUP_HEADERS = [
  { label: "", span: 1, tinted: false },
  { label: "", span: 1, tinted: true },
  { label: "สถานะการตรวจสอบ", span: 5, tinted: true },
  { label: "สถานะการบันทึกบัญชี", span: 4, tinted: true },
  { label: "บันทึกบัญชี (GL)", span: 5, tinted: true },
  { label: "", span: 1, tinted: false },
];

const COLUMN_LABELS = [
  "พนักงาน",
  "จำนวน",
  "รอตรวจสอบ",
  "ผ่าน",
  "ไม่ผ่าน",
  "ไม่บันทึก",
  "ไม่ต้องอนุมัติ",
  "ต้องบันทึก(งาน)",
  "บันทึกแล้ว(งาน)",
  "คงเหลือ",
  "เสร็จ",
  "คีย์",
  "คีย์(ไม่มีรูป)",
  "คีย์รวม",
  "ตรวจสอบ",
  "แก้ไข",
  "",
];

const COLUMN_TOOLTIPS: Record<string, string> = {
  "ต้องบันทึก(งาน)": "คำนวณจากสถานะของงาน (task) ฝั่ง /task",
  คีย์: "นับจำนวนรายการบันทึกบัญชี (GL) ไม่ใช่จำนวนเอกสาร",
  "คีย์(ไม่มีรูป)": "รายการที่คีย์โดยไม่มีรูปหรือเอกสารอ้างอิง",
  คีย์รวม: "= คีย์ + คีย์(ไม่มีรูป)",
};

/** Ported from KpiCombinedPage's DataTable2 + 3-level expand/collapse drill-down. */
export function KpiTable({ employees, fontScale }: { employees: KpiCombinedEmployee[]; fontScale: number }) {
  useEmployeeMappings();
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  function toggleEmployee(name: string) {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        setExpandedShops((s) => new Set([...s].filter((k) => !k.startsWith(`${name} `))));
        setExpandedTasks((t) => new Set([...t].filter((k) => !k.startsWith(`${name} `))));
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function toggleShop(key: string) {
    setExpandedShops((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setExpandedTasks((t) => new Set([...t].filter((k) => !k.startsWith(`${key}#`))));
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleTask(key: string) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (employees.length === 0) {
    return <EmptyState icon={Inbox} size="page" title="ไม่พบข้อมูล" />;
  }

  const fs = (base: number) => `${base * fontScale}px`;
  const totalPages = Math.max(1, Math.ceil(employees.length / rowsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const pageEmployees = employees.slice((effectivePage - 1) * rowsPerPage, effectivePage * rowsPerPage);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">รายชื่อพนักงาน</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">คลิกที่รายชื่อเพื่อดูรายละเอียดร้านและงาน</p>
        </div>
        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-info-strong">
          ทั้งหมด {employees.length.toLocaleString("th-TH")} คน
        </span>
      </div>

      <div className="divide-y divide-border md:hidden">
        {pageEmployees.map((employee) => (
          <MobileEmployeeCard
            key={employee.name}
            employee={employee}
            expanded={expandedEmployees.has(employee.name)}
            expandedShops={expandedShops}
            onToggleEmployee={toggleEmployee}
            onToggleShop={toggleShop}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block" style={{ fontSize: fs(12) }}>
        <div className="w-full" style={{ minWidth: GRID_MIN_WIDTH }}>
        {/* Group banner row */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          {GROUP_HEADERS.map((g, i) => (
            <div
              key={i}
              style={{ gridColumn: `span ${g.span}`, fontSize: fs(10) }}
              className={`flex h-6 items-center justify-center font-semibold uppercase tracking-wide text-muted-foreground ${
                g.tinted ? "bg-secondary" : ""
              }`}
            >
              {g.label}
            </div>
          ))}
        </div>
        {/* Column label row */}
        <div className="grid border-b border-border bg-secondary" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          {COLUMN_LABELS.map((label, i) => (
            <div
              key={i}
              title={COLUMN_TOOLTIPS[label]}
              style={{ fontSize: fs(11) }}
              className={`flex h-10 items-center border-l border-border px-2 font-semibold text-muted-foreground ${i === 0 ? "justify-start border-l-0" : "justify-center text-center"}`}
            >
              {label}
            </div>
          ))}
        </div>

        {pageEmployees.map((emp, idx) => {
          const displayName = getDisplayName(emp.name);
          const isExpanded = expandedEmployees.has(emp.name);
          return (
            <div key={emp.name} className={idx % 2 === 0 ? "bg-card" : "bg-secondary/40"}>
              <div
                className="group grid cursor-pointer border-b border-border transition-colors hover:bg-accent/40"
                style={{ gridTemplateColumns: GRID_TEMPLATE, minHeight: 64 }}
                onClick={() => toggleEmployee(emp.name)}
              >
                <div className="flex items-center gap-3 border-l border-l-transparent px-3 py-2 transition-colors group-hover:border-l-indigo-400">
                  <UserAvatar name={displayName} size={KpiDimensions.avatarRadius * 2} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground" style={{ fontSize: fs(12) }}>
                      {displayName}
                    </p>
                    {displayName !== emp.name && <p className="truncate text-[10px] text-muted-foreground">{emp.name}</p>}
                    <p className="truncate text-[10px] text-muted-foreground">
                      {emp.shopStats.length} ร้าน · {emp.shopStats.reduce((s, sh) => s + sh.tasks.length, 0)} งาน
                      {emp.totalUploaded > 0 ? ` · อัปโหลด ${emp.totalUploaded}` : ""}
                    </p>
                  </div>
                </div>
                {numCell(emp.totalDocuments)}
                {numericColumns({
                  waitingVerify: emp.waitingVerify,
                  passed: emp.passedDocuments,
                  cancelled: emp.cancelledDocuments,
                  notRecorded: emp.notRecordedDocuments,
                  notRequiredApproval: emp.notRequiredApprovalDocuments,
                  requiredToRecord: emp.requiredToRecordDocuments,
                  recorded: emp.recordedDocuments,
                  remaining: emp.remainingDocuments,
                  completed: emp.completedDocuments,
                  journalCount: emp.totalJournals,
                  journalCountNoPhoto: emp.totalJournalsNoPhoto,
                  journalChecked: emp.totalChecked,
                  journalUpdated: emp.totalUpdated,
                })}
                <div className="flex items-center justify-center text-muted-foreground group-hover:text-info-strong">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </div>

              {isExpanded &&
                emp.shopStats.map((shop) => (
                  <ShopRow
                    key={shop.shopName}
                    employeeName={emp.name}
                    shop={shop}
                    expandedShops={expandedShops}
                    expandedTasks={expandedTasks}
                    onToggleShop={toggleShop}
                    onToggleTask={toggleTask}
                    fs={fs}
                  />
                ))}
            </div>
          );
        })}
        </div>
      </div>
      <Pagination
        currentPage={effectivePage}
        totalItems={employees.length}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={(rows) => {
          setRowsPerPage(rows);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}

function MobileEmployeeCard({
  employee,
  expanded,
  expandedShops,
  onToggleEmployee,
  onToggleShop,
}: {
  employee: KpiCombinedEmployee;
  expanded: boolean;
  expandedShops: Set<string>;
  onToggleEmployee: (name: string) => void;
  onToggleShop: (key: string) => void;
}) {
  const displayName = getDisplayName(employee.name);
  const taskCount = employee.shopStats.reduce((total, shop) => total + shop.tasks.length, 0);

  return (
    <article className="bg-card px-3 py-3">
      <button
        type="button"
        onClick={() => onToggleEmployee(employee.name)}
        aria-expanded={expanded}
        className="w-full rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-secondary"
      >
        <div className="flex items-center gap-3">
          <UserAvatar name={displayName} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            {displayName !== employee.name && <p className="truncate text-[10px] text-muted-foreground">{employee.name}</p>}
            <p className="mt-0.5 text-[10px] text-muted-foreground">{employee.shopStats.length} ร้าน · {taskCount} งาน</p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <MobileMetric label="บิลที่รับผิดชอบ" value={employee.totalDocuments} />
          <MobileMetric label="รอตรวจสอบ" value={employee.waitingVerify} />
          <MobileMetric label="คงเหลือ" value={employee.remainingDocuments} />
          <MobileMetric label="คีย์รวม" value={employee.totalJournals + employee.totalJournalsNoPhoto} />
        </div>
      </button>

      {expanded && (
        <div className="ml-3 mt-2 space-y-2 border-l border-border pl-3">
          {employee.shopStats.map((shop) => {
            const shopKey = `${employee.name} ${shop.shopName}`;
            return (
              <MobileShopCard
                key={shop.shopName}
                shop={shop}
                expanded={expandedShops.has(shopKey)}
                onToggle={() => onToggleShop(shopKey)}
              />
            );
          })}
        </div>
      )}
    </article>
  );
}

function MobileMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-xl bg-secondary px-2.5 py-2">
      <span className="block text-[9px] text-muted-foreground">{label}</span>
      <span className="mt-0.5 block text-sm font-semibold tabular-nums text-foreground">{value.toLocaleString("th-TH")}</span>
    </span>
  );
}

function MobileShopCard({ shop, expanded, onToggle }: { shop: KpiCombinedShopStat; expanded: boolean; onToggle: () => void }) {
  const expandable = shop.tasks.length > 0 || shop.orphanJournalEntries.length > 0;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => expandable && onToggle()}
        disabled={!expandable}
        aria-expanded={expandable ? expanded : undefined}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left disabled:cursor-default"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <Store className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{shop.shopName}</p>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            {shop.tasks.length} งาน · บิล {shop.totalDocuments.toLocaleString("th-TH")} · คงเหลือ {shop.remaining.toLocaleString("th-TH")}
          </p>
        </div>
        {expandable && (expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
      </button>

      {expanded && (
        <div className="border-t border-border bg-secondary/60 p-2">
          <div className="space-y-1.5">
            {shop.tasks.map((task, index) => {
              const status = STATUS_LABELS[task.status] ?? { label: `สถานะ ${task.status}`, color: KpiColors.mutedText };
              const journalStats = journalStatsForTask(task);
              return (
                <div key={`${task.taskName}-${index}`} className="rounded-lg border border-border bg-card px-2.5 py-2">
                  <div className="flex items-start gap-2">
                    <BriefcaseBusiness className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-foreground">{task.taskName}</p>
                      <p className="mt-1 text-[9px] text-muted-foreground">
                        บิล {task.totalDocument.toLocaleString("th-TH")} · บันทึกแล้ว {task.recorded.toLocaleString("th-TH")} · คีย์ {journalStats.journalCount.toLocaleString("th-TH")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold" style={{ backgroundColor: `${status.color}14`, borderColor: `${status.color}35`, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {shop.orphanJournalEntries.length > 0 && (
            <p className="mt-2 rounded-lg border border-dashed border-status-warning/40 bg-status-warning-soft px-2.5 py-2 text-[9px] font-medium text-status-warning-strong">
              รายการไม่ผูกงาน {shop.orphanJournalEntries.length.toLocaleString("th-TH")} รายการ
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ShopRow({
  employeeName,
  shop,
  expandedShops,
  expandedTasks,
  onToggleShop,
  onToggleTask,
  fs,
}: {
  employeeName: string;
  shop: KpiCombinedShopStat;
  expandedShops: Set<string>;
  expandedTasks: Set<string>;
  onToggleShop: (key: string) => void;
  onToggleTask: (key: string) => void;
  fs: (n: number) => string;
}) {
  const shopKey = `${employeeName} ${shop.shopName}`;
  const isExpanded = expandedShops.has(shopKey);
  const expandable = shop.tasks.length > 0 || shop.orphanJournalEntries.length > 0;

  return (
    <div className="bg-card">
      <div
        className={`group/shop grid border-b border-border bg-card ${expandable ? "cursor-pointer transition-colors hover:bg-secondary" : ""}`}
        style={{ gridTemplateColumns: GRID_TEMPLATE, minHeight: 50 }}
        onClick={() => expandable && onToggleShop(shopKey)}
      >
        <div className="flex min-w-0 items-center gap-2.5 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm">
            <Store className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold text-foreground" style={{ fontSize: fs(11.5) }}>
                {shop.shopName}
              </span>
              {shop.journalRequiredDocs > 0 && (
                <span className="shrink-0 rounded-full border border-border bg-card px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                  ต้องบันทึก {shop.journalRequiredDocs}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
              {shop.tasks.length} งาน{shop.orphanJournalEntries.length > 0 ? ` · ไม่ผูกงาน ${shop.orphanJournalEntries.length} รายการ` : ""}
            </p>
          </div>
        </div>
        {numCell(shop.totalDocuments)}
        {numericColumns({
          waitingVerify: shop.waitingVerify,
          passed: shop.passed,
          cancelled: shop.cancelled,
          notRecorded: shop.notRecorded,
          notRequiredApproval: shop.notRequiredApproval,
          requiredToRecord: shop.requiredToRecord,
          recorded: shop.recorded,
          remaining: shop.remaining,
          completed: shop.completed,
          journalCount: shop.journalCount,
          journalCountNoPhoto: shop.journalCountNoPhoto,
          journalChecked: shop.journalChecked,
          journalUpdated: shop.journalUpdated,
        })}
        <div className="flex items-center justify-center text-muted-foreground group-hover/shop:text-foreground">
          {expandable ? isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : null}
        </div>
      </div>

      {isExpanded && (
        <div className="border-l border-l-slate-200 bg-card">
          {shop.tasks.map((task, i) => (
            <TaskRow
              key={`${shopKey}#${i}`}
              taskKey={`${shopKey}#${i}`}
              task={task}
              isExpanded={expandedTasks.has(`${shopKey}#${i}`)}
              onToggle={onToggleTask}
              fs={fs}
            />
          ))}
          {shop.orphanJournalEntries.length > 0 && (
            <JournalDetailPanel title={`รายการที่ไม่ผูกกับงาน (${shop.orphanJournalEntries.length})`}>
              {shop.orphanJournalEntries.map((j, i) => (
                <OrphanJournalCard key={i} journal={j} fs={fs} />
              ))}
            </JournalDetailPanel>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  taskKey,
  task,
  isExpanded,
  onToggle,
  fs,
}: {
  taskKey: string;
  task: KpiCombinedTaskItem;
  isExpanded: boolean;
  onToggle: (key: string) => void;
  fs: (n: number) => string;
}) {
  const status = STATUS_LABELS[task.status] ?? { label: `สถานะ ${task.status}`, color: KpiColors.mutedText };
  const expandable = task.journalEntries.length > 0;
  const journalStats = journalStatsForTask(task);

  return (
    <div>
      <div
        className={`group/task grid border-b border-border bg-card ${expandable ? "cursor-pointer transition-colors hover:bg-secondary" : ""}`}
        style={{ gridTemplateColumns: GRID_TEMPLATE, minHeight: 48 }}
        onClick={() => expandable && onToggle(taskKey)}
      >
        <div className="relative flex min-w-0 items-center gap-2.5 py-2 pl-6 pr-3">
          <span className="absolute left-2.5 top-0 h-1/2 w-3 border-b border-l border-slate-300" aria-hidden="true" />
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground group-hover/task:bg-accent group-hover/task:text-info-strong">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold text-foreground" style={{ fontSize: fs(11.5) }}>
                {task.taskName}
              </span>
              <span
                className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold"
                style={{ backgroundColor: `${status.color}14`, borderColor: `${status.color}35`, color: status.color }}
              >
                {status.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {task.isOwner ? (
                <Chip icon={User} label="เจ้าของงาน" color={KpiColors.completed} />
              ) : (
                <>
                  <Chip icon={Users} label={`ร่วมคีย์ ${task.keyedByThisEmployee}`} color="#6366F1" />
                  <Chip label="บริบทงาน" color={KpiColors.contextValue} />
                </>
              )}
              {task.uploadedByThisEmployee > 0 && (
                <Chip icon={ImageUp} label={`อัปโหลด ${task.uploadedByThisEmployee}`} color="#3B82F6" />
              )}
              <span className="text-[10px] text-muted-foreground">{task.ownerAt.toLocaleDateString("th-TH")}</span>
            </div>
          </div>
        </div>
        {numCell(task.totalDocument)}
        {numericColumns({
          waitingVerify: task.waitingVerify,
          passed: task.passed,
          cancelled: task.cancelled,
          notRecorded: task.notRecorded,
          notRequiredApproval: task.notRequiredApproval,
          requiredToRecord: task.requiredToRecord,
          recorded: task.recorded,
          remaining: task.remaining,
          completed: task.completed,
          journalCount: journalStats.journalCount,
          journalCountNoPhoto: journalStats.journalCountNoPhoto,
          journalChecked: journalStats.journalChecked,
          journalUpdated: journalStats.journalUpdated,
        })}
        <div className="flex items-center justify-center text-muted-foreground group-hover/task:text-info-strong">
          {expandable ? isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" /> : null}
        </div>
      </div>

      {isExpanded && (
        <JournalDetailPanel title={`รายการบันทึกบัญชี (${task.journalEntries.length})`}>
          {task.journalEntries.map((j, i) => (
            <JournalEntryCard key={i} journal={j} fs={fs} />
          ))}
        </JournalDetailPanel>
      )}
    </div>
  );
}

function JournalDetailPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border bg-secondary/80 px-6 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-info" />
          {title}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

function Chip({ icon: Icon, label, color }: { icon?: typeof User; label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

function JournalEntryCard({ journal, fs }: { journal: KpiCombinedTaskItem["journalEntries"][number]; fs: (n: number) => string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <p className="font-medium" style={{ fontSize: fs(11) }}>
        {journal.docNo} <span className="text-muted-foreground">· {journal.accountName}</span>
      </p>
      <p className="text-[10px] text-muted-foreground">
        เดบิต/เครดิต {journal.debit || journal.credit ? (journal.debit || journal.credit).toLocaleString("th-TH") : 0} · คีย์โดย{" "}
        {getDisplayName(journal.createdBy)}
      </p>
      <p className="text-[10px] text-muted-foreground">
        คีย์เมื่อ {journal.keyedAt ? journal.keyedAt.toLocaleString("th-TH") : "-"}
      </p>
    </div>
  );
}

function OrphanJournalCard({ journal, fs }: { journal: KpiCombinedTaskItem["journalEntries"][number]; fs: (n: number) => string }) {
  const reason = !journal.documentRef && !journal.jobGuidfixed
    ? "ยังไม่มีรูปหรือเอกสารอ้างอิงสำหรับรายการนี้"
    : !journal.resolvedTaskGuidFound
      ? "มีเอกสารอ้างอิงแล้ว แต่ยังไม่พบงานที่ตรงกัน"
      : "เชื่อมกับงานแล้ว";
  return (
    <div className="rounded-xl border border-dashed border-status-warning/40 bg-status-warning-soft px-3 py-2.5">
      <p className="font-medium" style={{ fontSize: fs(11) }}>
        {journal.docNo} <span className="text-muted-foreground">· {journal.accountName}</span>
      </p>
      <p className="text-[10px] text-status-warning-strong">{reason}</p>
      <div className="hidden">
        <span className="w-fit rounded-md bg-status-warning-soft px-2 py-1 text-[10px] font-bold text-status-warning-strong">ไม่ผูกงาน</span>
        <p className="min-w-0 flex-1 text-[10px] font-medium text-status-warning-strong md:px-3">{reason}</p>
        <div className="min-w-0 text-[10px] text-muted-foreground md:text-right">
          <p className="truncate">{getDisplayName(journal.createdBy)}</p>
          <p>{journal.keyedAt ? journal.keyedAt.toLocaleString("th-TH") : "-"}</p>
        </div>
      </div>
    </div>
  );
}
