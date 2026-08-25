"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllGLJournals, getJournalBooks, getJournalDetailByDocNo } from "@/lib/api/journal-service";
import { selectShop } from "@/lib/api/multi-shop-service";

export function useGLJournals(shopId: string) {
  return useQuery({
    queryKey: ["gl-journals", shopId],
    queryFn: async () => {
      if (!(await selectShop(shopId))) throw new Error("ไม่สามารถเลือกสาขาได้");
      return getAllGLJournals({ shopId, limit: 1000 });
    },
    enabled: Boolean(shopId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useJournalBooks(shopId: string) {
  return useQuery({ queryKey: ["journal-books", shopId], queryFn: getJournalBooks, enabled: Boolean(shopId), staleTime: 10 * 60 * 1000 });
}

export function useJournalDetail(docNo: string, enabled: boolean) {
  return useQuery({ queryKey: ["gl-journal-detail", docNo], queryFn: () => getJournalDetailByDocNo(docNo), enabled: enabled && Boolean(docNo), staleTime: 10 * 60 * 1000 });
}
