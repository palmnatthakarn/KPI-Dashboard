import { TrendingUp, TrendingDown, Trophy, AlertTriangle, Info } from "lucide-react";
import { formatCompact } from "@/lib/journal/journal-helpers";

/** Ported from _buildKpiSection / _buildKpiCard (journal_page.dart). */
export function JournalKpiSection({ income, expenses, profit }: { income: number; expenses: number; profit: number }) {
  return (
    <div className="mx-3 my-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
      <KpiCard label="รายได้" value={income} icon={TrendingUp} color="#10B981" />
      <KpiCard label="รายจ่าย" value={expenses} icon={TrendingDown} color="#EF4444" />
      <div className="col-span-2 lg:col-span-1">
        <KpiCard
          label="กำไรสุทธิ"
          value={profit}
          icon={profit >= 0 ? Trophy : AlertTriangle}
          color={profit >= 0 ? "#3B82F6" : "#F59E0B"}
          primary
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  primary = false,
}: {
  label: string;
  value: number;
  icon: typeof TrendingUp;
  color: string;
  primary?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 shadow-sm"
      style={
        primary
          ? { backgroundColor: color, boxShadow: `0 4px 8px ${color}4D` }
          : { backgroundColor: "#fff", border: "1px solid #E5E7EB" }
      }
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: primary ? "rgba(255,255,255,0.2)" : `${color}1A` }}
      >
        <Icon className="h-[18px] w-[18px]" style={{ color: primary ? "#fff" : color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium" style={{ color: primary ? "rgba(255,255,255,0.9)" : "#6B7280" }}>
          {label}
        </p>
        <p className="truncate text-base font-extrabold tracking-tight" style={{ color: primary ? "#fff" : "#1F2937" }}>
          {formatCompact(value)}
        </p>
      </div>
      {primary && <Info className="h-3.5 w-3.5 shrink-0 text-white/70" aria-label="กำไร = รายได้ - รายจ่าย" />}
    </div>
  );
}
