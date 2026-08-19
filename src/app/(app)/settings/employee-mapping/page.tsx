"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileDown,
  Link2,
  Loader2,
  Pencil,
  Search,
  Trash2,
  User,
  UserRoundPlus,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import NextLink from "next/link";
import { UserAvatar } from "@/components/common/user-avatar";
import { cn } from "@/lib/utils";
import {
  removeMapping,
  saveMapping,
  useEmployeeMappings,
  useEmployeeMappingStatus,
  useKnownEmployees,
} from "@/lib/employee/employee-mapping-service";

type Tab = "all" | "mapped" | "unmapped";

const tabs: Array<{ value: Tab; label: string }> = [
  { value: "all", label: "ทั้งหมด" },
  { value: "mapped", label: "ตั้งชื่อแล้ว" },
  { value: "unmapped", label: "รอตั้งชื่อ" },
];

/** Ported from EmployeeMappingPage (employee_mapping_page.dart). */
export default function EmployeeMappingPage() {
  const mappings = useEmployeeMappings();
  const known = useKnownEmployees();
  const { status: syncStatus, error: syncError } = useEmployeeMappingStatus();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: "rename" | "delete"; username: string; displayName: string } | null>(null);

  const mappedEntries = useMemo(() => Object.entries(mappings), [mappings]);
  const unmappedNames = useMemo(() => known.filter((name) => !(name in mappings)), [known, mappings]);

  const q = search.trim().toLowerCase();
  const filteredMapped = mappedEntries.filter(
    ([username, displayName]) => !q || username.toLowerCase().includes(q) || displayName.toLowerCase().includes(q)
  );
  const filteredUnmapped = unmappedNames.filter((name) => !q || name.toLowerCase().includes(q));

  const totalEmployees = mappedEntries.length + unmappedNames.length;
  const visibleCount =
    tab === "mapped" ? filteredMapped.length : tab === "unmapped" ? filteredUnmapped.length : filteredMapped.length + filteredUnmapped.length;
  const mappedPercent = totalEmployees > 0 ? Math.round((mappedEntries.length / totalEmployees) * 100) : 0;
  const showMapped = tab !== "unmapped";
  const showUnmapped = tab !== "mapped";

  const isEmpty = totalEmployees === 0;
  const noResults = !isEmpty && filteredMapped.length === 0 && filteredUnmapped.length === 0;

  function openRename(username: string, currentDisplayName: string) {
    setDialog({ mode: "rename", username, displayName: currentDisplayName });
  }

  function openDelete(username: string) {
    setDialog({ mode: "delete", username, displayName: mappings[username] ?? username });
  }

  async function handleDelete() {
    if (!dialog) return;
    setIsSaving(true);
    try {
      await removeMapping(dialog.username);
      setDialog(null);
      setToast("ลบชื่อที่ตั้งไว้แล้ว");
    } catch (error) {
      console.error("Unable to remove employee mapping", error);
      setToast("ลบชื่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  async function handleExportPdf() {
    setIsExporting(true);
    setToast("กำลังสร้างไฟล์ PDF...");
    try {
      const rows = [
        ...(showMapped
          ? filteredMapped.map(([username, displayName]) => ({
              displayName,
              email: username,
              status: "mapped" as const,
            }))
          : []),
        ...(showUnmapped
          ? filteredUnmapped.map((username) => ({
              displayName: "ยังไม่ได้ตั้งชื่อ",
              email: username,
              status: "unmapped" as const,
            }))
          : []),
      ];
      const { exportEmployeeMappingPdf } = await import("@/lib/employee/employee-mapping-pdf-export");
      await exportEmployeeMappingPdf({
        rows,
        modeLabel: tabs.find((item) => item.value === tab)?.label ?? "ทั้งหมด",
        search,
      });
      setToast("ส่งออก PDF สำเร็จ");
    } catch (error) {
      console.error("Unable to export employee mapping PDF", error);
      setToast("สร้าง PDF ไม่สำเร็จ");
    } finally {
      setIsExporting(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <NextLink
            href="/settings"
            aria-label="กลับไปหน้าตั้งค่า"
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </NextLink>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Employee Alias</p>
            <h1 className="mt-0.5 text-lg font-semibold text-[#0F172A]">จัดการชื่อพนักงาน</h1>
            <p className="mt-1 text-xs text-[#64748B]">
              จัดชื่อแสดงผลสำหรับ KPI และรายงาน โดยยังเก็บ Email ไว้เป็นตัวอ้างอิง
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
          <MetricCard icon={UsersRound} label="ทั้งหมด" value={totalEmployees} />
          <MetricCard icon={CheckCircle2} label="ตั้งแล้ว" value={mappedEntries.length} />
          <MetricCard icon={UserRoundPlus} label="รอชื่อ" value={unmappedNames.length} />
        </div>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่อพนักงาน หรือ Email"
              className="h-10 w-full rounded-lg bg-secondary py-2 pl-9 pr-10 text-xs outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="ล้างคำค้นหา"
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-white hover:text-[#0F172A]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((item) => (
              <FilterButton
                key={item.value}
                active={tab === item.value}
                onClick={() => setTab(item.value)}
                label={item.label}
                count={item.value === "all" ? totalEmployees : item.value === "mapped" ? mappedEntries.length : unmappedNames.length}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting || visibleCount === 0}
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#0F172A] shadow-sm transition hover:bg-[#0F172A] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Export PDF
          </button>

          <div className="flex min-w-[220px] items-center gap-3 xl:ml-auto">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div className="h-full rounded-full bg-[#0F172A]" style={{ width: `${mappedPercent}%` }} />
            </div>
            <span className="text-xs font-semibold text-[#475569]">{mappedPercent}%</span>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl glass-panel">
        <div className="flex flex-col gap-2 border-b border-[#E2E8F0] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">รายชื่อพนักงาน</h2>
            <p className="mt-0.5 text-xs text-[#64748B]">แสดง {visibleCount.toLocaleString("th-TH")} รายการจากตัวกรองปัจจุบัน</p>
          </div>
          <span className="w-fit rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-[#475569]">
            โหมด {tabs.find((item) => item.value === tab)?.label}
          </span>
        </div>

        {syncStatus === "loading" && isEmpty ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-[#64748B]">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายชื่อจาก Firebase...
          </div>
        ) : syncStatus === "error" && isEmpty ? (
          <EmptyState
            icon={UsersRound}
            title="โหลดรายชื่อจาก Firebase ไม่สำเร็จ"
            description={syncError ?? "กรุณาตรวจสอบการเชื่อมต่อและลองเปิดหน้านี้อีกครั้ง"}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={UsersRound}
            title="ยังไม่มีรายชื่อพนักงาน"
            description="รายชื่อจะถูกเพิ่มอัตโนมัติเมื่อเปิดหน้า KPI และระบบดึงข้อมูลพนักงานสำเร็จ"
          />
        ) : noResults ? (
          <EmptyState icon={Search} title="ไม่พบผลลัพธ์" description="ลองเปลี่ยนคำค้นหา หรือเลือกแท็บทั้งหมดเพื่อดูรายชื่ออีกครั้ง" />
        ) : (
          <div className="divide-y divide-[#E2E8F0]/80">
            {showMapped && filteredMapped.length > 0 && (
              <EmployeeSection title="ตั้งค่าชื่อแล้ว" count={filteredMapped.length}>
                {filteredMapped.map(([username, displayName]) => (
                  <MappedEmployeeRow
                    key={username}
                    username={username}
                    displayName={displayName}
                    onRename={() => openRename(username, displayName)}
                    onDelete={() => openDelete(username)}
                  />
                ))}
              </EmployeeSection>
            )}

            {showUnmapped && filteredUnmapped.length > 0 && (
              <EmployeeSection title="ยังไม่ได้ตั้งชื่อ" count={filteredUnmapped.length}>
                {filteredUnmapped.map((username) => (
                  <UnmappedEmployeeRow key={username} username={username} onRename={() => openRename(username, "")} />
                ))}
              </EmployeeSection>
            )}
          </div>
        )}
      </section>

      {dialog?.mode === "rename" && (
        <RenameDialog
          username={dialog.username}
          initialDisplayName={dialog.displayName}
          isSaving={isSaving}
          onCancel={() => setDialog(null)}
          onSave={async (name) => {
            setIsSaving(true);
            try {
              await saveMapping(dialog.username, name);
              setDialog(null);
              setToast("บันทึกชื่อบน Firebase แล้ว");
            } catch (error) {
              console.error("Unable to save employee mapping", error);
              setToast("บันทึกชื่อไม่สำเร็จ กรุณาลองใหม่");
            } finally {
              setIsSaving(false);
              setTimeout(() => setToast(null), 2500);
            }
          }}
        />
      )}

      {dialog?.mode === "delete" && (
        <DeleteDialog
          username={dialog.username}
          isSaving={isSaving}
          onCancel={() => setDialog(null)}
          onConfirm={handleDelete}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-lg">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {toast}
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-3">
      <div className="flex items-center gap-2 text-[#64748B]">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-[#0F172A]">{value.toLocaleString("th-TH")}</p>
    </div>
  );
}

function FilterButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition",
        active ? "border-[#0F172A] bg-[#0F172A] text-white" : "border-transparent bg-secondary text-[#64748B] hover:text-[#0F172A]"
      )}
    >
      <span>{label}</span>
      <span className={cn("rounded px-1.5 py-0.5 text-[11px]", active ? "bg-white/15 text-white" : "bg-[#E2E8F0] text-[#64748B]")}>
        {count.toLocaleString("th-TH")}
      </span>
    </button>
  );
}

function EmployeeSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="bg-white/26">
      <div className="flex items-center justify-between bg-white/42 px-4 py-2.5 backdrop-blur">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#334155]">{title}</h3>
        <span className="rounded-full border border-[#E2E8F0] bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#64748B]">
          {count.toLocaleString("th-TH")} คน
        </span>
      </div>
      <div className="hidden grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_140px_120px] border-t border-[#E2E8F0]/80 bg-[#F8FAFC]/70 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#64748B] lg:grid">
        <span>พนักงาน</span>
        <span>Email</span>
        <span>สถานะ</span>
        <span className="text-right">จัดการ</span>
      </div>
      <div>{children}</div>
    </section>
  );
}

function MappedEmployeeRow({
  username,
  displayName,
  onRename,
  onDelete,
}: {
  username: string;
  displayName: string;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRename}
      className="group grid w-full min-w-0 gap-3 border-t border-[#E2E8F0]/80 bg-white/36 px-4 py-3 text-left transition hover:bg-white/78 lg:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_140px_120px] lg:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={displayName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#0F172A]">{displayName}</p>
          <p className="mt-1 text-xs text-[#64748B] lg:hidden">{username}</p>
        </div>
      </div>
      <p className="hidden min-w-0 items-center gap-1.5 truncate text-xs text-[#64748B] lg:flex">
        <Link2 className="h-3 w-3 shrink-0" />
        <span className="truncate">{username}</span>
      </p>
      <div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#DCFCE7]/80 px-2.5 py-1 text-[11px] font-semibold text-[#15803D]">
          <CheckCircle2 className="h-3 w-3" />
          ตั้งชื่อแล้ว
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 lg:justify-end lg:opacity-0 lg:transition lg:group-hover:opacity-100">
        <IconButton label="แก้ไขชื่อ" onClick={onRename}>
          <Pencil className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="ลบชื่อที่ตั้งไว้" onClick={onDelete} danger>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </button>
  );
}

function UnmappedEmployeeRow({ username, onRename }: { username: string; onRename: () => void }) {
  return (
    <div className="grid min-w-0 gap-3 border-t border-[#E2E8F0]/80 bg-white/20 px-4 py-3 transition hover:bg-white/58 lg:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_140px_120px] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white/70 text-[#64748B]">
          <User className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#0F172A]">ยังไม่ได้ตั้งชื่อ</p>
          <p className="mt-1 text-xs text-[#64748B] lg:hidden">{username}</p>
        </div>
      </div>
      <p className="hidden min-w-0 truncate text-xs text-[#64748B] lg:block">{username}</p>
      <div>
        <span className="inline-flex w-fit items-center rounded-full border border-[#E2E8F0] bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#64748B]">
          รอตั้งชื่อ
        </span>
      </div>
      <button
        type="button"
        onClick={onRename}
        className="inline-flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 text-xs font-semibold text-white hover:bg-[#1E293B] lg:ml-auto"
      >
        <UserRoundPlus className="h-3.5 w-3.5" />
        ตั้งชื่อ
      </button>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white/78 shadow-sm backdrop-blur transition hover:bg-white",
        danger ? "text-[#DC2626] hover:border-[#FECACA]" : "text-[#64748B] hover:text-[#0F172A]"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="p-10 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-[#64748B]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-semibold text-[#0F172A]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#64748B]">{description}</p>
    </div>
  );
}

function RenameDialog({
  username,
  initialDisplayName,
  isSaving,
  onCancel,
  onSave,
}: {
  username: string;
  initialDisplayName: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (displayName: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialDisplayName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 text-[#0F172A] shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">ตั้งชื่อแสดงผล</h3>
            <p className="mt-1 text-xs text-[#64748B]">ชื่อนี้จะถูกใช้ในหน้า KPI และรายงานที่เกี่ยวข้อง</p>
          </div>
          <button type="button" onClick={onCancel} disabled={isSaving} aria-label="ปิด" className="rounded-lg p-2 text-[#64748B] hover:bg-secondary disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#475569]">Email</label>
            <div className="rounded-lg border border-[#E2E8F0] bg-secondary px-3 py-2.5 text-sm text-[#0F172A]">{username}</div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#475569]">ชื่อแสดงผล</label>
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
              placeholder="กรอกชื่อที่ต้องการแสดง"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isSaving} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-secondary disabled:opacity-50">
            ยกเลิก
          </button>
          <button type="button" disabled={isSaving || !value.trim()} onClick={() => void onSave(value)} className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E293B] disabled:opacity-50">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({ username, isSaving, onCancel, onConfirm }: { username: string; isSaving: boolean; onCancel: () => void; onConfirm: () => Promise<void> }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 text-[#0F172A] shadow-lg">
        <h3 className="text-base font-semibold">ลบชื่อที่ตั้งไว้?</h3>
        <p className="mt-2 text-sm leading-6 text-[#64748B]">
          ชื่อของ &quot;{username}&quot; จะกลับไปแสดงเป็น Email เดิม
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isSaving} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-secondary disabled:opacity-50">
            ยกเลิก
          </button>
          <button type="button" disabled={isSaving} onClick={() => void onConfirm()} className="inline-flex items-center gap-2 rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} ลบ
          </button>
        </div>
      </div>
    </div>
  );
}
