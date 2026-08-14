import { BarChart3 } from "lucide-react";

/** Ported from ReportEmptyState (report_empty_state.dart). */
export function ReportEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 pt-16 text-center">
      <div className="rounded-full bg-card p-6 shadow-md">
        <BarChart3 className="h-16 w-16 text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-lg font-semibold text-muted-foreground">เลือกรายงานที่ต้องการดู</p>
        <p className="mt-1 text-sm text-muted-foreground/70">กรุณาเลือกประเภทรายงานและช่วงเวลาจากด้านบน</p>
      </div>
    </div>
  );
}
