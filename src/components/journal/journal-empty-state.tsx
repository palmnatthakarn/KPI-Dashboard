import { Inbox } from "lucide-react";

/** Ported from JournalEmptyState (journal_empty_state.dart). */
export function JournalEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-full bg-slate-100 p-6">
        <Inbox className="h-16 w-16 text-slate-400" />
      </div>
      <p className="text-lg font-bold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}
