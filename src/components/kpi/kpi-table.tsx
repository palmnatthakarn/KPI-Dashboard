"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Inbox, ImageUp, User, Users } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";
import { Pagination } from "@/components/common/pagination";
import { KpiColors, KpiDimensions } from "@/lib/kpi/kpi-constants";
import { getDisplayName } from "@/lib/employee/employee-mapping-service";
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
      className="flex h-full items-center justify-center border-l border-white/45 text-[12px] font-semibold tabular-nums"
      style={{ backgroundColor: bg, color: isZero ? KpiColors.zeroValue : KpiColors.primaryText }}
    >
      {isZero ? "—" : value.toLocaleString("th-TH")}
    </div>
  );
}

function dashCell(bg?: string) {
  return (
    <div className="flex h-full items-center justify-center border-l border-white/45 text-[12px] tabular-nums" style={{ backgroundColor: bg, color: KpiColors.zeroValue }}>
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
      {numCell(stats.waitingVerify, KpiColors.section2Background)}
      {numCell(stats.passed, KpiColors.section2Background)}
      {numCell(stats.cancelled, KpiColors.section2Background)}
      {numCell(stats.notRecorded, KpiColors.section2Background)}
      {numCell(stats.notRequiredApproval, KpiColors.section2Background)}
      {numCell(stats.requiredToRecord, KpiColors.section3Background)}
      {numCell(stats.recorded, KpiColors.section3Background)}
      {numCell(stats.remaining, KpiColors.section3Background)}
      {numCell(stats.completed, KpiColors.section3Background)}
      {numCell(stats.journalCount, KpiColors.journalGroupBackground)}
      {numCell(stats.journalCountNoPhoto, KpiColors.journalGroupBackground)}
      {numCell(stats.journalCount + stats.journalCountNoPhoto, KpiColors.journalGroupBackground)}
      {numCell(stats.journalChecked, KpiColors.journalGroupBackground)}
      {numCell(stats.journalUpdated, KpiColors.journalGroupBackground)}
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
  { label: "", span: 1, color: "transparent" },
  { label: "", span: 1, color: KpiColors.section1Background },
  { label: "สถานะการตรวจสอบ", span: 5, color: KpiColors.section2Background },
  { label: "สถานะการบันทึกบัญชี", span: 4, color: KpiColors.section3Background },
  { label: "บันทึกบัญชี (GL)", span: 5, color: KpiColors.journalGroupBackground },
  { label: "", span: 1, color: "transparent" },
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
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="rounded-full bg-slate-100 p-6">
          <Inbox className="h-12 w-12 text-slate-400" />
        </div>
        <p className="text-sm text-muted-foreground">ไม่พบข้อมูล</p>
      </div>
    );
  }

  const fs = (base: number) => `${base * fontScale}px`;
  const totalPages = Math.max(1, Math.ceil(employees.length / rowsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const pageEmployees = employees.slice((effectivePage - 1) * rowsPerPage, effectivePage * rowsPerPage);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#F1F5F9] px-5 py-3.5">
        <h2 className="text-[15px] font-bold text-slate-800">รายชื่อพนักงาน</h2>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
          ทั้งหมด {employees.length.toLocaleString("th-TH")} คน
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: KpiColors.section1Background }} />บิลที่รับผิดชอบ</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: KpiColors.journalGroupBackground }} />บันทึกบัญชี</span>
        </div>
      </div>
      <div className="overflow-x-auto" style={{ fontSize: fs(12) }}>
        <div className="w-full" style={{ minWidth: GRID_MIN_WIDTH }}>
        {/* Group banner row */}
        <div className="grid overflow-hidden rounded-t-xl" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          {GROUP_HEADERS.map((g, i) => (
            <div
              key={i}
              style={{ gridColumn: `span ${g.span}`, backgroundColor: g.color, fontSize: fs(10) }}
              className="flex h-5 items-center justify-center font-bold text-[#374151]"
            >
              {g.label}
            </div>
          ))}
        </div>
        {/* Column label row */}
        <div className="grid border-b border-[#E2E8F0] bg-[#F8FAFC]" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          {COLUMN_LABELS.map((label, i) => (
            <div
              key={i}
              title={COLUMN_TOOLTIPS[label]}
              style={{ fontSize: fs(11) }}
              className={`flex h-9 items-center border-l border-white/60 px-2 font-bold text-[#374151] ${i === 0 ? "justify-start border-l-0" : "justify-center text-center"}`}
            >
              {label}
            </div>
          ))}
        </div>

        {pageEmployees.map((emp, idx) => {
          const displayName = getDisplayName(emp.name);
          const isExpanded = expandedEmployees.has(emp.name);
          return (
            <div key={emp.name} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : KpiColors.alternateRow }}>
              <div
                className="grid cursor-pointer border-b border-[#F1F5F9] hover:bg-[#F8FAFC]"
                style={{ gridTemplateColumns: GRID_TEMPLATE, minHeight: 64 }}
                onClick={() => toggleEmployee(emp.name)}
              >
                <div className="flex items-center gap-3 px-3 py-2">
                  <UserAvatar name={displayName} size={KpiDimensions.avatarRadius * 2} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold" style={{ fontSize: fs(12) }}>
                      {displayName}
                    </p>
                    {displayName !== emp.name && <p className="truncate text-[10px] text-slate-500">{emp.name}</p>}
                    <p className="truncate text-[10px] text-muted-foreground">
                      {emp.shopStats.length} ร้าน · {emp.shopStats.reduce((s, sh) => s + sh.tasks.length, 0)} งาน
                      {emp.totalUploaded > 0 ? ` · อัปโหลด ${emp.totalUploaded}` : ""}
                    </p>
                  </div>
                </div>
                {numCell(emp.totalDocuments, KpiColors.section1Background)}
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
                <div className="flex items-center justify-center">
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
    <div className="border-b border-[#E2E8F0]">
      <div
        className={`grid border-b border-[#F1F5F9] bg-[#FAFAFA] ${expandable ? "cursor-pointer hover:bg-[#F1F5F9]" : ""}`}
        style={{ gridTemplateColumns: GRID_TEMPLATE, minHeight: 44 }}
        onClick={() => expandable && onToggleShop(shopKey)}
      >
        <div className="flex min-w-0 items-center gap-2 px-3 py-1.5">
          <span className="shrink-0 rounded-md border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#475569]">
            ร้าน
          </span>
          <span className="truncate font-medium text-[#374151]" style={{ fontSize: fs(11.5) }}>
            {shop.shopName}
          </span>
          {shop.journalRequiredDocs > 0 && (
            <span className="rounded-full bg-[#E0E7FF] px-1.5 py-0.5 text-[9px] font-semibold text-[#4338CA]">
              ต้องบันทึก {shop.journalRequiredDocs}
            </span>
          )}
        </div>
        {numCell(shop.totalDocuments, KpiColors.section1Background)}
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
        <div className="flex items-center justify-center">
          {expandable ? isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" /> : null}
        </div>
      </div>

      {isExpanded && (
        <div className="bg-white/60">
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
        className={`grid border-b border-[#F1F5F9] bg-white ${expandable ? "cursor-pointer hover:bg-[#F8FAFC]" : ""}`}
        style={{ gridTemplateColumns: GRID_TEMPLATE, minHeight: 38 }}
        onClick={() => expandable && onToggle(taskKey)}
      >
        <div className="flex min-w-0 items-center gap-2 px-3 py-1.5">
          <span className="w-3.5 shrink-0 text-muted-foreground">
            {expandable ? isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" /> : null}
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[9px] font-bold text-[#64748B]">
                งาน
              </span>
              <span className="truncate font-medium" style={{ fontSize: fs(11.5) }}>
                {task.taskName}
              </span>
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
                style={{ backgroundColor: status.color }}
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
        {numCell(task.totalDocument, KpiColors.section1Background)}
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
        <div className="flex items-center justify-center">
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
    <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]/75 px-3 py-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">{title}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
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
    <div className="rounded-lg border border-[#F1F5F9] bg-white px-3 py-1.5">
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
    <div className="rounded-lg border border-dashed border-[#F1F5F9] bg-[#FFFBEB] px-3 py-1.5">
      <p className="font-medium" style={{ fontSize: fs(11) }}>
        {journal.docNo} <span className="text-muted-foreground">· {journal.accountName}</span>
      </p>
      <p className="text-[10px] text-[#B45309]">{reason}</p>
      <div className="hidden">
        <span className="w-fit rounded-md bg-[#FFFBEB] px-2 py-1 text-[10px] font-bold text-[#B45309]">ไม่ผูกงาน</span>
        <p className="min-w-0 flex-1 text-[10px] font-medium text-[#B45309] md:px-3">{reason}</p>
        <div className="min-w-0 text-[10px] text-[#64748B] md:text-right">
          <p className="truncate">{getDisplayName(journal.createdBy)}</p>
          <p>{journal.keyedAt ? journal.keyedAt.toLocaleString("th-TH") : "-"}</p>
        </div>
      </div>
    </div>
  );
}
