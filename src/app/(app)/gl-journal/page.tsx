import { redirect } from "next/navigation";

/**
 * GLJournalPage (gl_journal_page.dart) is unreachable dead code in the
 * Flutter source — confirmed via grep, zero call sites; superseded by
 * JournalPage (the actually-reachable transaction drill-down, ported at
 * /journal) and KpiCombinedPage's GL-journal reconciliation. Redirect
 * anyone with the old link to /journal.
 */
export default function Page() {
  redirect("/journal");
}
