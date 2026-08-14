import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

/** Ported from JournalSummaryBar (journal_summary_bar.dart). */
export function JournalSummaryBar({ totalDebit, totalCredit }: { totalDebit: string; totalCredit: string }) {
  return (
    <div className="flex items-center justify-around gap-3 border-t border-border bg-white px-4 py-3">
      <SummaryItem label="เดบิต" value={totalDebit} color="#3B82F6" Icon={ArrowUpCircle} />
      <div className="h-8 w-px bg-border" />
      <SummaryItem label="เครดิต" value={totalCredit} color="#8B5CF6" Icon={ArrowDownCircle} />
    </div>
  );
}

function SummaryItem({
  label,
  value,
  color,
  Icon,
}: {
  label: string;
  value: string;
  color: string;
  Icon: typeof ArrowUpCircle;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" style={{ color }} />
      <div>
        <p className="text-[11px] font-medium" style={{ color }}>
          {label}
        </p>
        <p className="text-sm font-extrabold text-foreground">{value}</p>
      </div>
    </div>
  );
}
