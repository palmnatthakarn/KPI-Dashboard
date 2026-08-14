"use client";

import { useMemo, useState, useEffect } from "react";
import { Calendar, FileText, List, Tag, ArrowUp, ArrowDown, ChevronUp, ChevronDown } from "lucide-react";
import type { Journal } from "@/types/journal";
import { DocNoCell } from "@/components/journal/doc-no-cell";
import { Pagination } from "@/components/common/pagination";
import { journalDisplayDate } from "@/lib/journal/journal-helpers";

interface Column {
  key: string;
  label: string;
  icon: typeof Calendar;
  numeric?: boolean;
}

const COLUMNS: Column[] = [
  { key: "date", label: "วันที่", icon: Calendar },
  { key: "docno", label: "เลขที่เอกสาร", icon: FileText },
  { key: "name", label: "รายการ", icon: List },
  { key: "type", label: "ประเภท", icon: Tag },
  { key: "debit", label: "เดบิต", icon: ArrowUp, numeric: true },
  { key: "credit", label: "เครดิต", icon: ArrowDown, numeric: true },
];

/** Ported from JournalTable (journal_table.dart). Rows are pre-filtered/sorted by the parent. */
export function JournalTable({
  rows,
  typeColor,
  typeDisplay,
  numFmt,
  sortColumnIndex,
  sortAscending,
  onSort,
  onCopyDocNo,
}: {
  rows: Journal[];
  typeColor: (t?: string | null) => string;
  typeDisplay: (t?: string | null) => string;
  numFmt: (n: number) => string;
  sortColumnIndex: number | null;
  sortAscending: boolean;
  onSort: (index: number, ascending: boolean) => void;
  onCopyDocNo?: (docNo: string) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const totalPages = rows.length === 0 ? 1 : Math.ceil(rows.length / rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [rows.length, totalPages, currentPage]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, currentPage, rowsPerPage]);

  function handleHeaderClick(index: number) {
    if (sortColumnIndex === index) {
      onSort(index, !sortAscending);
    } else {
      onSort(index, true);
    }
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-[11px]">
          <thead>
            <tr className="bg-[#F8FAFC]">
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(i)}
                  className={`h-11 cursor-pointer select-none px-4 font-bold tracking-wide text-[#374151] ${col.numeric ? "text-right" : "text-left"}`}
                >
                  <span className={`inline-flex items-center gap-1 ${col.numeric ? "flex-row-reverse" : ""}`}>
                    <col.icon className="h-3 w-3 text-[#6B7280]" />
                    {col.label}
                    {sortColumnIndex === i &&
                      (sortAscending ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((j, i) => {
              const debit = j.debit ?? 0;
              const credit = j.credit ?? 0;
              const color = typeColor(j.accounttype);
              return (
                <tr key={j.id ?? `${j.docno}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
                  <td className="h-13 px-4 py-3 text-[#374151]">{journalDisplayDate(j)}</td>
                  <td className="px-4 py-3">
                    <DocNoCell docNo={j.docno ?? "-"} onCopy={onCopyDocNo} />
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-[#1F2937]" title={j.accountname ?? "-"}>
                    {j.accountname ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block rounded-full border px-2.5 py-1.5 text-[10px] font-bold"
                      style={{ color, backgroundColor: `${color}1A`, borderColor: `${color}4D` }}
                    >
                      {typeDisplay(j.accounttype)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {debit > 0 ? (
                      <span className="inline-block rounded-lg bg-[#D1FAE5] px-2.5 py-1 text-[11px] font-extrabold text-[#059669]">
                        {numFmt(debit)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {credit > 0 ? (
                      <span className="inline-block rounded-lg bg-[#EDE9FE] px-2.5 py-1 text-[11px] font-extrabold text-[#7C3AED]">
                        {numFmt(credit)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalItems={rows.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(n) => {
            setRowsPerPage(n);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}
