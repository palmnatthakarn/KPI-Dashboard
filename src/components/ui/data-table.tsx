"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/common/pagination";

export interface Column<T> {
  /** Stable identity for the column — also the React key and the sort key. */
  id: string;
  header: React.ReactNode;
  /** Numeric columns should be `right` so digits line up for scanning. */
  align?: "left" | "right" | "center";
  /** Tailwind width utility, e.g. "w-14". */
  width?: string;
  cell: (row: T, index: number) => React.ReactNode;
  /** Applied to every body cell in this column. */
  cellClassName?: string;
  /** Renders the header as a sort control. Requires the `sort` prop. */
  sortable?: boolean;
}

/**
 * Controlled sorting. The table never sorts rows itself — the parent already
 * owns filtering, and splitting the two would let them disagree about order.
 */
export interface DataTableSort {
  columnId: string | null;
  ascending: boolean;
  onSortChange: (columnId: string, ascending: boolean) => void;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  /**
   * Makes rows activatable. When set, rows become keyboard-focusable and
   * respond to Enter/Space — a plain `onClick` on a <tr> is mouse-only and
   * locks out anyone navigating by keyboard.
   */
  onRowClick?: (row: T) => void;
  /** Accessible name for an activatable row. Required for a usable screen-reader pass. */
  getRowLabel?: (row: T) => string;
  /** Minimum table width before horizontal scrolling kicks in. */
  minWidth?: number;
  /** Alternating row tint. Off by default — borders alone are usually enough. */
  zebra?: boolean;
  /** Rendered in place of the table body when there are no rows. */
  emptyState?: React.ReactNode;
  /** Row-level tint, e.g. for total rows. */
  getRowClassName?: (row: T, index: number) => string | undefined;
  sort?: DataTableSort;
  pagination?: {
    currentPage: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rows: number) => void;
    /** Defaults to `rows.length`; pass explicitly when paginating server-side. */
    totalItems?: number;
  };
  className?: string;
}

const ALIGN_CLASS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

/**
 * The app's one data table. Every list view should render through this so
 * header weight, row height, zebra rules, focus behaviour and pagination stay
 * identical — previously each domain hand-rolled its own <table> and they had
 * drifted on padding, header size and alignment rules.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  getRowLabel,
  minWidth = 800,
  zebra = false,
  emptyState,
  getRowClassName,
  sort,
  pagination,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <div className={cn("rounded-2xl border border-border bg-card", className)}>{emptyState}</div>;
  }

  const interactive = typeof onRowClick === "function";

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead className="bg-secondary/60">
            <tr>
              {columns.map((column) => {
                const sortable = column.sortable && sort;
                const active = sortable && sort.columnId === column.id;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    // Announces the current sort to screen readers; without it a
                    // sorted table is indistinguishable from an unsorted one.
                    aria-sort={
                      active ? (sort.ascending ? "ascending" : "descending") : sortable ? "none" : undefined
                    }
                    className={cn(
                      "px-3 py-2.5 text-xs font-semibold text-muted-foreground",
                      ALIGN_CLASS[column.align ?? "left"],
                      column.width
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => sort.onSortChange(column.id, active ? !sort.ascending : true)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active && "text-foreground",
                          column.align === "right" && "flex-row-reverse"
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort.ascending ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                {...(interactive
                  ? {
                      tabIndex: 0,
                      "aria-label": getRowLabel?.(row),
                      onClick: () => onRowClick(row),
                      onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        // Let controls inside the row handle their own keys.
                        if (event.target !== event.currentTarget) return;
                        event.preventDefault();
                        onRowClick(row);
                      },
                    }
                  : {})}
                className={cn(
                  "border-t border-border transition-colors",
                  interactive &&
                    "cursor-pointer hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  zebra && index % 2 === 1 && "bg-secondary/20",
                  getRowClassName?.(row, index)
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      "px-3 py-2.5",
                      ALIGN_CLASS[column.align ?? "left"],
                      column.cellClassName
                    )}
                  >
                    {column.cell(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems ?? rows.length}
          rowsPerPage={pagination.rowsPerPage}
          onPageChange={pagination.onPageChange}
          onRowsPerPageChange={pagination.onRowsPerPageChange}
        />
      )}
    </div>
  );
}
