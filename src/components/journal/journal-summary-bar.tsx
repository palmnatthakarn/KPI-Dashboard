import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

/** Ported from JournalSummaryBar (journal_summary_bar.dart). */
export function JournalSummaryBar({ totalDebit, totalCredit }: { totalDebit: string; totalCredit: string }) {
  return (
    <div className="flex items-center justify-around gap-3 border-t border-border bg-card px-4 py-3">
      <SummaryItem label="เดบิต" value={totalDebit} className="text-status-safe-strong" Icon={ArrowUpCircle} />
      <div className="h-8 w-px bg-border" />
      <SummaryItem label="เครดิต" value={totalCredit} className="text-info-strong" Icon={ArrowDownCircle} />
    </div>
  );
}

function SummaryItem({
  label,
  value,
  className,
  Icon,
}: {
  label: string;
  value: string;
  /** Token-based text color — matches the debit/credit chips in the table. */
  className: string;
  Icon: typeof ArrowUpCircle;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-5 w-5 ${className}`} />
      <div>
        <p className={`text-[11px] font-medium ${className}`}>{label}</p>
        <p className="text-sm font-extrabold text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  );
}
