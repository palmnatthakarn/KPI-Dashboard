import { DataTable, type Column } from "@/components/ui/data-table";
import type { ReportTableData } from "@/types/report";

interface ReportRow {
  cells: string[];
  isTotal: boolean;
}

/** Ported from GenericReportTable (generic_report_table.dart). */
export function GenericReportTable({ headers, rows, highlightRows }: ReportTableData) {
  const data: ReportRow[] = rows.map((cells, index) => ({
    cells,
    // A row is a total either because the report flagged it or because its
    // label reads as one — both conventions exist in the report payloads.
    isTotal: (highlightRows?.includes(index) ?? false) || (cells[0]?.includes("รวม") ?? false),
  }));

  const columns: Column<ReportRow>[] = headers.map((header, index) => ({
    id: `col-${index}`,
    header,
    // Only the first column is a label; the rest are figures, right-aligned
    // so digits line up down the column.
    align: index === 0 ? "left" : "right",
    cellClassName: index === 0 ? "whitespace-nowrap" : "whitespace-nowrap tabular-nums",
    cell: (row) => (
      <span className={row.isTotal ? "font-bold text-foreground" : "text-muted-foreground"}>
        {row.cells[index]}
      </span>
    ),
  }));

  return (
    <DataTable
      columns={columns}
      rows={data}
      getRowKey={(_, index) => `row-${index}`}
      minWidth={800}
      zebra
      getRowClassName={(row) => (row.isTotal ? "bg-info-soft/60" : undefined)}
    />
  );
}
