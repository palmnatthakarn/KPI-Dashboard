"use client";

import { Folder } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { statusPalette, accentPalette } from "@/lib/design/tokens";
import type { DocumentCounts } from "@/lib/dashboard/dashboard-helper";

/** Ported from EnhancedDocumentCard in dashboard_statistics_grid.dart. */
export function DocumentCard({
  counts,
  isLoading,
  error,
}: {
  counts: DocumentCounts;
  isLoading: boolean;
  error: Error | null;
}) {
  const numFmt = new Intl.NumberFormat("th-TH");

  return (
    <StatTile
      label="เอกสารทั้งหมด"
      value={counts.total}
      sublabel="ฉบับ"
      icon={Folder}
      accent="info"
      loading={isLoading}
      error={error ? "โหลดข้อมูลเอกสารไม่สำเร็จ กรุณากดรีเฟรช" : null}
      footer={
        !isLoading &&
        !error && (
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
            <DetailItem
              label="ต้องบันทึก"
              value={numFmt.format(counts.requiredToRecord)}
              dotColor={accentPalette.info.base}
            />
            <DetailItem
              label="บันทึกแล้ว"
              value={numFmt.format(counts.recorded)}
              dotColor={statusPalette.safe.base}
            />
            <DetailItem
              label="จัดการแล้ว"
              value={`${numFmt.format(counts.recorded)}/${numFmt.format(counts.requiredToRecord)}`}
              dotColor={accentPalette.neutral.base}
            />
          </div>
        )
      }
    />
  );
}

function DetailItem({ label, value, dotColor }: { label: string; value: string; dotColor: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-xs font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
