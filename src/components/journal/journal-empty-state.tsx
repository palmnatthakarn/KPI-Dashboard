import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/** Ported from JournalEmptyState (journal_empty_state.dart). */
export function JournalEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return <EmptyState icon={Inbox} size="page" title={title} description={subtitle} />;
}
