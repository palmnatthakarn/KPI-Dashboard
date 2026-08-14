import { cn } from "@/lib/utils";
import type { ReportTableData } from "@/types/report";

/** Ported from GenericReportTable (generic_report_table.dart). */
export function GenericReportTable({ headers, rows, highlightRows }: ReportTableData) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-secondary/60">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={cn(
                  "px-4 py-3 text-[13px] font-bold text-[#334155]",
                  i === 0 ? "text-left" : "text-right"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => {
            const isHighlight = highlightRows?.includes(rowIndex) ?? false;
            const isEven = rowIndex % 2 === 0;
            const isTotalRow = isHighlight || cells[0]?.includes("รวม");

            return (
              <tr
                key={rowIndex}
                className={cn(
                  "border-t border-border/60 transition-colors hover:bg-secondary/40",
                  isHighlight ? "bg-[#EFF6FF]" : isEven ? "bg-card" : "bg-secondary/20"
                )}
              >
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      "px-4 py-2.5 whitespace-nowrap",
                      cellIndex === 0 ? "text-left" : "text-right",
                      isTotalRow ? "font-bold text-[#0F172A]" : "text-[#475569]"
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
