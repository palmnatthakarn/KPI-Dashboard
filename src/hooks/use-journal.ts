"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllJournals } from "@/lib/api/journal-service";

/**
 * Ported from _showJournalDialogForBranch (branch_data_source.dart), which
 * calls JournalService.getAllJournals(shopId: ..., limit: 1000) and passes
 * the full result set into JournalPage for local filter/sort/search.
 */
export function useJournalsForShop(shopId: string) {
  return useQuery({
    queryKey: ["journals", shopId],
    queryFn: () => getAllJournals({ shopId, limit: 1000 }),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000,
  });
}
