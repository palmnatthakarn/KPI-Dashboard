import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

/**
 * Ported 1:1 from settings_page.dart — the real page has exactly one
 * section ("การตั้งค่า") with exactly one item (Employee mapping); nothing
 * else exists to port here.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">ตั้งค่า</h1>

      <div className="space-y-3">
        <p className="pl-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">การตั้งค่า</p>
        <div className="overflow-hidden rounded-2xl glass-panel">
          <Link
            href="/settings/employee-mapping"
            className="flex items-center gap-4 p-4 hover:bg-white/70"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white/70">
              <Users className="h-[22px] w-[22px] text-[#0F172A]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-[#1E293B]">จัดการชื่อพนักงาน</p>
              <p className="text-xs text-[#64748B]">แก้ไขหรือแทนที่ชื่อพนักงานที่แสดงในรายงาน</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#CBD5E1]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
