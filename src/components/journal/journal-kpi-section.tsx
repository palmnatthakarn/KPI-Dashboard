import { TrendingUp, TrendingDown, Trophy, AlertTriangle } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { formatCompact } from "@/lib/journal/journal-helpers";

/** Ported from _buildKpiSection / _buildKpiCard (journal_page.dart). */
export function JournalKpiSection({
  income,
  expenses,
  profit,
}: {
  income: number;
  expenses: number;
  profit: number;
}) {
  return (
    <div className="mx-3 my-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
      <StatTile label="รายได้" value={formatCompact(income)} icon={TrendingUp} accent="safe" />
      <StatTile label="รายจ่าย" value={formatCompact(expenses)} icon={TrendingDown} accent="exceeded" />
      <div className="col-span-2 lg:col-span-1">
        <StatTile
          label="กำไรสุทธิ"
          value={formatCompact(profit)}
          sublabel="รายได้ - รายจ่าย"
          icon={profit >= 0 ? Trophy : AlertTriangle}
          accent={profit >= 0 ? "info" : "warning"}
        />
      </div>
    </div>
  );
}
