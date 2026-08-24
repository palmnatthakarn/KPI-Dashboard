import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/** Ported from ReportEmptyState (report_empty_state.dart). */
export function ReportEmptyState() {
  return (
    <EmptyState
      icon={BarChart3}
      size="page"
      title="เลือกรายงานที่ต้องการดู"
      description="กรุณาเลือกประเภทรายงานและช่วงเวลาจากด้านบน"
    />
  );
}
