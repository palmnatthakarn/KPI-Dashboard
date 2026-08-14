"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/** Simplified port of CustomPagination (custom_pagination.dart). */
export function Pagination({
  currentPage,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 20, 50],
}: {
  currentPage: number;
  totalItems: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  rowsPerPageOptions?: number[];
}) {
  const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / rowsPerPage);

  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-secondary/50 px-4 py-3">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageNumbers.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={
              p === currentPage
                ? "rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                : "rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
            }
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="ml-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span>แถวต่อหน้า</span>
        <select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          className="rounded-md border border-input bg-background px-2 py-1"
        >
          {rowsPerPageOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
