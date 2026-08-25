"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Download, Loader2, Printer, Search, X } from "lucide-react";
import { JournalEmptyState } from "@/components/journal/journal-empty-state";
import { formatNumber, journalDisplayDate } from "@/lib/journal/journal-helpers";
import { useGLJournals, useJournalBooks, useJournalDetail } from "@/hooks/use-gl-journal";
import type { Journal } from "@/types/journal";

const PAGE_SIZE = 20;

export default function GLJournalPage() {
  return <Suspense fallback={<Loading />}><GLJournalContent /></Suspense>;
}

function GLJournalContent() {
  const router = useRouter();
  const params = useSearchParams();
  const shopId = params.get("shop") ?? params.get("shopids") ?? "";
  const shopName = params.get("shopName") ?? params.get("shop_name") ?? shopId;
  const { data, isLoading, isError, error } = useGLJournals(shopId);
  const { data: books = [], isLoading: booksLoading } = useJournalBooks(shopId);
  const [search, setSearch] = useState("");
  const [bookCode, setBookCode] = useState("");
  const [expanded, setExpanded] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.data ?? []).filter((journal) => {
      const matchesBook = !bookCode || journal.bookcode === bookCode || journal.bookname === bookCode;
      const matchesSearch = !q || [journal.docno, journal.accountcode, journal.accountname, journal.bookname].some((value) => value?.toLowerCase().includes(q));
      return matchesBook && matchesSearch;
    });
  }, [data, search, bookCode]);

  useEffect(() => setPage(1), [search, bookCode]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalDebit = filtered.reduce((sum, row) => sum + (row.debit ?? 0), 0);
  const totalCredit = filtered.reduce((sum, row) => sum + (row.credit ?? 0), 0);

  function exportCsv() {
    const csv = [["วันที่", "เลขที่เอกสาร", "สมุดบัญชี", "รหัสบัญชี", "ชื่อบัญชี", "คำอธิบาย", "เดบิต", "เครดิต"],
      ...filtered.map((j) => [journalDisplayDate(j), j.docno, j.bookname, j.accountcode, j.accountname, j.accountdescription, j.debit ?? 0, j.credit ?? 0])]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = `gl-journal-${shopId}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <div className="-m-4 flex min-h-[calc(100vh-4rem)] flex-col bg-secondary sm:-m-6">
    <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
      <button onClick={() => router.back()} className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-accent" aria-label="ย้อนกลับ"><ArrowLeft className="h-5 w-5" /></button>
      <div className="rounded-xl bg-info/10 p-2.5"><BookOpen className="h-6 w-6 text-info" /></div>
      <div><h1 className="text-lg font-bold text-foreground">สมุดรายวันทั่วไป</h1><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-status-safe" />{shopName || "ไม่ระบุสาขา"}</p></div>
      <div className="ml-auto flex gap-1"><button onClick={() => window.print()} className="rounded-xl p-2.5 text-muted-foreground hover:bg-accent" title="พิมพ์รายงาน"><Printer className="h-5 w-5" /></button><button onClick={exportCsv} className="rounded-xl p-2.5 text-muted-foreground hover:bg-accent" title="ส่งออก CSV"><Download className="h-5 w-5" /></button></div>
    </header>

    {!shopId ? <JournalEmptyState title="ไม่พบสาขา" subtitle="กรุณาเปิดหน้านี้พร้อมพารามิเตอร์ shop" /> : isLoading ? <Loading /> : isError ? <JournalEmptyState title="โหลดข้อมูลไม่สำเร็จ" subtitle={error instanceof Error ? error.message : "เกิดข้อผิดพลาด"} /> : <>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:px-6">
        <label className="relative flex h-12 flex-1 items-center rounded-xl border border-border bg-card shadow-sm"><Search className="ml-4 h-5 w-5 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" placeholder="ค้นหาเลขที่เอกสาร, รหัสบัญชี, ชื่อบัญชี..." />{search && <button onClick={() => setSearch("")} className="mr-3 text-muted-foreground"><X className="h-4 w-4" /></button>}</label>
        <select value={bookCode} onChange={(event) => setBookCode(event.target.value)} disabled={booksLoading} className="h-12 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm"><option value="">{booksLoading ? "กำลังโหลดสมุด..." : "คัดกรองสมุด"}</option>{books.map((book) => <option key={book.guidfixed ?? book.code} value={book.code ?? book.name1}>{book.name1 ?? book.code ?? "-"}</option>)}</select>
      </div>
      <div className="mx-4 flex-1 overflow-auto rounded-2xl border border-border bg-card shadow-sm sm:mx-6">
        {filtered.length === 0 ? <JournalEmptyState title="ไม่พบรายการที่ค้นหา" subtitle="ลองค้นหาด้วยคำสำคัญอื่น หรือเปลี่ยนตัวกรอง" /> : <table className="w-full min-w-[1100px] border-collapse text-sm"><thead className="sticky top-0 z-10 bg-secondary text-left text-xs text-muted-foreground"><tr>{["วันที่", "เลขที่เอกสาร", "สมุดบัญชี", "รหัสบัญชี", "ชื่อบัญชี", "คำอธิบาย", "เดบิต", "เครดิต"].map((heading, index) => <th key={heading} className={`border-b border-border px-4 py-3 font-semibold ${index > 5 ? "text-right" : ""}`}>{heading}</th>)}</tr></thead><tbody>{rows.map((journal, index) => <JournalRow key={`${journal.id ?? journal.docno}-${index}`} journal={journal} expanded={expanded === journal.docno} onToggle={() => setExpanded(expanded === journal.docno ? "" : journal.docno ?? "")} />)}</tbody></table>}
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground sm:px-6"><span>แสดง {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border bg-card px-3 py-1.5 disabled:opacity-40">ก่อนหน้า</button><span className="px-2 py-1.5">{page} / {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border bg-card px-3 py-1.5 disabled:opacity-40">ถัดไป</button></div></div>
      <footer className="flex flex-col gap-3 border-t border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:px-8"><div><p className="font-semibold text-foreground">สรุปยอดรวม</p><p className="text-xs text-muted-foreground">{filtered.length} รายการ</p></div><div className="flex gap-3 sm:ml-auto"><Summary label="รวมเดบิต" value={totalDebit} tone="safe" /><Summary label="รวมเครดิต" value={totalCredit} tone="danger" /></div></footer>
    </>}
  </div>;
}

function JournalRow({ journal, expanded, onToggle }: { journal: Journal; expanded: boolean; onToggle: () => void }) {
  const detail = useJournalDetail(journal.docno ?? "", expanded);
  const debit = journal.debit && journal.debit > 0 ? journal.debit : journal.amount;
  const credit = journal.credit && journal.credit > 0 ? journal.credit : journal.amount;
  return <><tr onClick={onToggle} className="cursor-pointer border-b border-border/70 hover:bg-accent/40"><td className="px-4 py-3 text-muted-foreground"><span className="flex items-center gap-2">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{journalDisplayDate(journal)}</span></td><td className="px-4 py-3 font-mono font-semibold">{journal.docno ?? "-"}</td><td className="px-4 py-3">{journal.bookname ?? "-"}</td><td className="px-4 py-3 font-mono text-muted-foreground">{journal.accountcode ?? "-"}</td><td className="px-4 py-3 font-medium">{journal.accountname ?? "-"}</td><td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{journal.accountdescription ?? "-"}</td><td className="px-4 py-3 text-right font-mono font-semibold text-status-safe-strong">{debit ? formatNumber(debit) : "-"}</td><td className="px-4 py-3 text-right font-mono font-semibold text-destructive">{credit ? formatNumber(credit) : "-"}</td></tr>{expanded && <tr><td colSpan={8} className="bg-secondary/60 px-8 py-5">{detail.isLoading ? <Loading compact /> : detail.isError ? <p className="text-sm text-destructive">ไม่สามารถโหลดรายละเอียดได้</p> : detail.data ? <div className="space-y-3 text-sm">{detail.data.exdocrefno && <p className="text-muted-foreground">เลขที่เอกสารอ้างอิง: {detail.data.exdocrefno}</p>}{detail.data.accountdescription && <p>คำอธิบาย: {detail.data.accountdescription}</p>}{detail.data.debtor?.names?.[0]?.name && <p className="font-medium">ลูกหนี้: {detail.data.debtor.names[0].name}</p>}<table className="w-full overflow-hidden rounded-lg border border-border bg-card"><thead><tr className="bg-secondary text-xs text-muted-foreground"><th className="p-2 text-left">รหัสบัญชี</th><th className="p-2 text-left">ชื่อบัญชี</th><th className="p-2 text-right">เดบิต</th><th className="p-2 text-right">เครดิต</th></tr></thead><tbody>{detail.data.journaldetail?.map((item, index) => <tr key={`${item.accountcode}-${index}`} className="border-t border-border"><td className="p-2 font-mono">{item.accountcode ?? "-"}</td><td className="p-2">{item.accountname ?? "-"}</td><td className="p-2 text-right font-mono">{item.debitamount ? formatNumber(item.debitamount) : "-"}</td><td className="p-2 text-right font-mono">{item.creditamount ? formatNumber(item.creditamount) : "-"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">ไม่พบรายละเอียดเพิ่มเติม</p>}</td></tr>}</>;
}

function Summary({ label, value, tone }: { label: string; value: number; tone: "safe" | "danger" }) { return <div className={`min-w-36 rounded-xl border px-5 py-2.5 text-right ${tone === "safe" ? "border-status-safe/20 bg-status-safe/10 text-status-safe-strong" : "border-destructive/20 bg-destructive/10 text-destructive"}`}><p className="text-xs font-semibold">{label}</p><p className="font-mono text-lg font-bold">{formatNumber(value)}</p></div>; }
function Loading({ compact = false }: { compact?: boolean }) { return <div className={`flex items-center justify-center gap-2 text-sm text-muted-foreground ${compact ? "py-4" : "flex-1 py-20"}`}><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลดข้อมูล...</div>; }
