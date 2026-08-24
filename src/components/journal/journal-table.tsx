"use client";

import { useMemo, useState, useEffect } from "react";
import { Inbox } from "lucide-react";
import type { Journal } from "@/types/journal";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DocNoCell } from "@/components/journal/doc-no-cell";
import { journalDisplayDate } from "@/lib/journal/journal-helpers";

/**
 * Column order is load-bearing: the parent's `sortJournals` switches on the
 * column INDEX, so these ids must stay in this order to keep sorting correct.
 */
const COLUMN_IDS = ["date", "docno", "name", "type", "debit", "credit"] as const;

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

  const columns: Column<Journal>[] = [
    {
      id: "date",
      header: "วันที่",
      sortable: true,
      cellClassName: "whitespace-nowrap text-muted-foreground",
      cell: (journal) => journalDisplayDate(journal),
    },
    {
      id: "docno",
      header: "เลขที่เอกสาร",
      sortable: true,
      cell: (journal) => <DocNoCell docNo={journal.docno ?? "-"} onCopy={onCopyDocNo} />,
    },
    {
      id: "name",
      header: "รายการ",
      sortable: true,
      cellClassName: "max-w-[240px] truncate",
      cell: (journal) => (
        <span title={journal.accountname ?? "-"}>{journal.accountname ?? "-"}</span>
      ),
    },
    {
      id: "type",
      header: "ประเภท",
      sortable: true,
      cell: (journal) => {
        const color = typeColor(journal.accounttype);
        return (
          <span
            className="inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold"
            style={{ color, backgroundColor: `${color}1A`, borderColor: `${color}4D` }}
          >
            {typeDisplay(journal.accounttype)}
          </span>
        );
      },
    },
    {
      id: "debit",
      header: "เดบิต",
      align: "right",
      sortable: true,
      cellClassName: "tabular-nums",
      cell: (journal) => {
        const debit = journal.debit ?? 0;
        if (debit <= 0) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="inline-block rounded-lg bg-status-safe-soft px-2.5 py-1 font-semibold text-status-safe-strong">
            {numFmt(debit)}
          </span>
        );
      },
    },
    {
      id: "credit",
      header: "เครดิต",
      align: "right",
      sortable: true,
      cellClassName: "tabular-nums",
      cell: (journal) => {
        const credit = journal.credit ?? 0;
        if (credit <= 0) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="inline-block rounded-lg bg-info-soft px-2.5 py-1 font-semibold text-info-strong">
            {numFmt(credit)}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={pageRows}
      getRowKey={(journal, index) => (journal.id != null ? String(journal.id) : `${journal.docno}-${index}`)}
      minWidth={900}
      zebra
      emptyState={<EmptyState icon={Inbox} title="ไม่พบรายการ" />}
      sort={{
        columnId: sortColumnIndex === null ? null : COLUMN_IDS[sortColumnIndex] ?? null,
        ascending: sortAscending,
        onSortChange: (columnId, ascending) => {
          const index = COLUMN_IDS.indexOf(columnId as (typeof COLUMN_IDS)[number]);
          if (index >= 0) onSort(index, ascending);
        },
      }}
      pagination={{
        currentPage,
        rowsPerPage,
        totalItems: rows.length,
        onPageChange: setCurrentPage,
        onRowsPerPageChange: (n) => {
          setRowsPerPage(n);
          setCurrentPage(1);
        },
      }}
    />
  );
}
