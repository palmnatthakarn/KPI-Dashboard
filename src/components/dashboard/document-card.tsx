"use client";

import { Folder } from "lucide-react";
import type { DocumentCounts } from "@/lib/dashboard/dashboard-helper";

/** Ported from EnhancedDocumentCard in dashboard_statistics_grid.dart. */
export function DocumentCard({ counts }: { counts: DocumentCounts }) {
  const numFmt = new Intl.NumberFormat("th-TH");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#3B82F6]/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(59,130,246,0.08))] p-4 text-[#0F172A] shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2563EB]/55 hover:shadow-[0_18px_44px_rgba(59,130,246,0.13)]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#3B82F6] opacity-24 blur-2xl" />
      <div className="relative z-10">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">เอกสารทั้งหมด</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-[#0F172A] tabular-nums">{numFmt.format(counts.total)}</p>
            <p className="text-xs text-muted-foreground">ฉบับ</p>
          </div>
          <div className="rounded-full border border-[#3B82F6]/45 bg-white/85 p-2 shadow-sm backdrop-blur-sm" style={{ boxShadow: "0 10px 26px #3B82F630" }}>
            <Folder className="h-5 w-5 text-[#2563EB]" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <DetailItem label="รายรับ" value={numFmt.format(counts.deposit)} dotColor="#1D4ED8" />
          <DetailItem label="รายจ่าย" value={numFmt.format(counts.withdraw)} dotColor="#3B82F6" />
          <DetailItem label="จัดการแล้ว" value={numFmt.format(counts.approved)} dotColor="#60A5FA" />
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, dotColor }: { label: string; value: string; dotColor: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="text-[10px] text-[#64748B]">{label}</span>
      </div>
      <p className="text-xs font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}
