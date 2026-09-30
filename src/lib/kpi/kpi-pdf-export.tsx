"use client";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { getDisplayName } from "@/lib/employee/employee-mapping-service";
import { countOcrAnalyzedGroupsUploadedBy } from "@/types/document-image";
import {
  EMPTY_DOC_SEARCH,
  collectMatchedJournals,
  describeDocSearch,
  filterEmployeesByDocSearch,
  isDocSearchActive,
  type DocSearch,
  type MatchedJournal,
} from "@/lib/kpi/kpi-doc-search";
import type { KpiCombinedEmployee } from "@/types/kpi-combined";

let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  const origin = window.location.origin;
  Font.register({
    family: "Sarabun",
    fonts: [
      { src: `${origin}/fonts/Sarabun-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/Sarabun-Bold.ttf`, fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

// react-pdf only wraps at spaces and Thai has none, so long labels carry an
// explicit "\n" to stay inside their narrow column.
const headers = [
  "ร้าน / งาน / รายการ",
  "บิลที่\nรับผิดชอบ",
  "อัปโหลด\nโดยคนนี้",
  "รอตรวจสอบ",
  "ผ่าน",
  "ไม่ผ่าน",
  "ไม่บันทึก",
  "ไม่ต้อง\nอนุมัติ",
  "ต้องบันทึก\n(งาน)",
  "บันทึกแล้ว\n(งาน)",
  "คงเหลือ",
  "เสร็จ",
  "คีย์",
  "คีย์\n(ไม่มีรูป)",
  "คีย์รวม",
  "ตรวจสอบ",
  "แก้ไข",
  "AI\nวิเคราะห์แล้ว",
];

// Same column groups as the on-screen KPI table: a thicker rule sits on the
// left of each group's first column (ตรวจสอบ / บันทึกบัญชี / GL / OCR).
const GROUP_START_COLUMNS = new Set(
  ["รอตรวจสอบ", "ต้องบันทึก\n(งาน)", "คีย์", "AI\nวิเคราะห์แล้ว"].map((label) => headers.indexOf(label))
);
const GROUP_DIVIDER_WIDTH = 1;

const detailHeaders = ["เลขที่เอกสาร", "ร้าน", "งาน", "บัญชี", "เดบิต/เครดิต", "คีย์โดย", "คีย์เมื่อ"];

// A document search can surface many journals; keep the PDF bounded so
// generation cannot freeze the browser.
const MAX_DETAIL_ROWS = 1000;

function formatPdfNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatPdfCell(cell: string, header: boolean): string {
  if (header || !/^-?\d+(?:\.\d+)?$/.test(cell.trim())) return cell;
  const value = Number(cell);
  return Number.isFinite(value) ? value.toLocaleString("en-US", { maximumFractionDigits: 20 }) : cell;
}

const styles = StyleSheet.create({
  page: { padding: 22, fontFamily: "Sarabun", fontSize: 6.5, color: "#1f2937" },
  title: { fontSize: 15, fontWeight: 700, textAlign: "center" },
  subtitle: { marginTop: 2, fontSize: 8, color: "#64748b", textAlign: "center" },
  meta: { marginTop: 8, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 7 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#111827", marginBottom: 8 },
  group: { marginBottom: 10 },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 3, borderBottomWidth: 0.7, borderBottomColor: "#111827" },
  groupName: { width: "50%", paddingRight: 6, fontSize: 9, fontWeight: 700 },
  groupSummary: { width: "50%", fontSize: 7, color: "#64748b", textAlign: "right" },
  row: { flexDirection: "row", borderLeftWidth: 0.35, borderBottomWidth: 0.35, borderColor: "#94a3b8", minHeight: 18 },
  headerRow: { backgroundColor: "#e2e8f0", minHeight: 34 },
  totalRow: { backgroundColor: "#eff6ff" },
  contextRow: { color: "#ea580c" },
  firstCell: { width: "18%", padding: 2.5, borderRightWidth: 0.35, borderColor: "#94a3b8", justifyContent: "center" },
  cell: { width: "4.8%", padding: 2, borderRightWidth: 0.35, borderColor: "#94a3b8", justifyContent: "center", textAlign: "right" },
  headerText: { fontWeight: 700, textAlign: "center", fontSize: 5.8 },
  filterNote: { marginTop: 2, fontSize: 8, color: "#1d4ed8", textAlign: "center" },
  detailTitle: { marginTop: 5, marginBottom: 2, fontSize: 7, fontWeight: 700, color: "#334155" },
  detailRow: { flexDirection: "row", borderLeftWidth: 0.35, borderBottomWidth: 0.35, borderColor: "#94a3b8", minHeight: 14 },
  detailHeaderRow: { backgroundColor: "#e2e8f0" },
  detailCell: { padding: 2, borderRightWidth: 0.35, borderColor: "#94a3b8", justifyContent: "center" },
  truncatedNote: { marginTop: 2, fontSize: 6.5, color: "#b45309" },
  footer: { position: "absolute", left: 22, right: 22, bottom: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 6, color: "#64748b" },
});

function shopCells(shop: KpiCombinedEmployee["shopStats"][number], employeeName: string): string[] {
  return [
    shop.shopName,
    String(shop.totalDocuments),
    String(shop.uploadedCount),
    String(shop.waitingVerify),
    String(shop.passed),
    String(shop.cancelled),
    String(shop.notRecorded),
    String(shop.notRequiredApproval),
    String(shop.requiredToRecord),
    String(shop.recorded),
    String(shop.remaining),
    String(shop.completed),
    String(shop.journalCount),
    String(shop.journalCountNoPhoto),
    String(shop.journalCount + shop.journalCountNoPhoto),
    String(shop.journalChecked),
    String(shop.journalUpdated),
    String(countOcrAnalyzedGroupsUploadedBy(shop.uploadedImages, employeeName)),
  ];
}

function PdfTableRow({ cells, header = false, total = false, context = false }: { cells: string[]; header?: boolean; total?: boolean; context?: boolean }) {
  return (
    <View style={[styles.row, header ? styles.headerRow : {}, total ? styles.totalRow : {}, context ? styles.contextRow : {}]} wrap={false}>
      {cells.map((cell, index) => (
        <View
          key={index}
          style={[
            index === 0 ? styles.firstCell : styles.cell,
            // The divider is drawn as the right border of the cell before the group.
            GROUP_START_COLUMNS.has(index + 1) ? { borderRightWidth: GROUP_DIVIDER_WIDTH } : {},
          ]}
        >
          <Text style={header ? styles.headerText : {}}>
            {!header && index === 0 ? `${formatPdfCell(cell, false)}\u00A0` : formatPdfCell(cell, header)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const DETAIL_WIDTHS = ["15%", "17%", "20%", "18%", "9%", "11%", "10%"];

function PdfDetailRow({ cells, header = false }: { cells: string[]; header?: boolean }) {
  return (
    <View style={[styles.detailRow, header ? styles.detailHeaderRow : {}]} wrap={false}>
      {cells.map((cell, index) => (
        <View
          key={index}
          style={[styles.detailCell, { width: DETAIL_WIDTHS[index], alignItems: index === 4 ? "flex-end" : "flex-start" }]}
        >
          <Text style={header ? styles.headerText : {}}>{cell}</Text>
        </View>
      ))}
    </View>
  );
}

function detailCells({ shopName, taskName, journal }: MatchedJournal): string[] {
  const amount = journal.debit || journal.credit || 0;
  return [
    journal.docNo,
    shopName,
    taskName ?? "ไม่ผูกงาน",
    journal.accountName || "-",
    formatPdfNumber(amount),
    getDisplayName(journal.createdBy),
    journal.keyedAt ? journal.keyedAt.toLocaleString("th-TH") : "-",
  ];
}

function KpiPdfDocument({
  employees: allEmployees,
  startDate,
  endDate,
  userName,
  docSearch,
}: {
  employees: KpiCombinedEmployee[];
  startDate: Date;
  endDate: Date;
  userName: string;
  docSearch: DocSearch;
}) {
  const date = (value: Date) => value.toLocaleDateString("th-TH");
  const searchActive = isDocSearchActive(docSearch);
  // Mirror the table: only employees and shops containing a match, plus the matched journals.
  const employees = filterEmployeesByDocSearch(allEmployees, docSearch);
  let detailBudget = MAX_DETAIL_ROWS;
  const detailsByEmployee = employees.map((employee) => {
    const matched = collectMatchedJournals(employee, docSearch);
    const shown = matched.slice(0, Math.max(0, detailBudget));
    detailBudget -= shown.length;
    return { shown, total: matched.length };
  });
  return (
    <Document title="รายงาน KPI" author={userName}>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <Text style={styles.title}>รายงาน KPI</Text>
        <Text style={styles.subtitle}>ช่วงข้อมูล {date(startDate)} ถึง {date(endDate)}</Text>
        {searchActive ? <Text style={styles.filterNote}>ตัวกรอง: {describeDocSearch(docSearch)}</Text> : null}
        <View style={styles.meta}>
          <Text>ผู้จัดพิมพ์ {userName || "ผู้ใช้งาน"}</Text>
          <Text>วันที่จัดพิมพ์ {date(new Date())}</Text>
        </View>
        <View style={styles.rule} />
        {employees.map((employee, employeeIndex) => {
          const displayName = getDisplayName(employee.name);
          const employeeLabel = displayName === employee.name
            ? employee.name
            : `${displayName} (${employee.name})`;
          // Keep PDF generation bounded: the interactive table can contain
          // thousands of task/journal detail rows. The printable report uses
          // the same KPI totals summarized per employee and shop, which is
          // the useful management view and avoids freezing the browser.
          const rows = employee.shopStats.map((shop) => shopCells(shop, employee.name));
          const [firstRow, ...remainingRows] = rows;
          const totals = employee.shopStats.reduce(
            (acc, shop) => acc.map((value, index) => index === 0 ? 0 : value + (Number(shopCells(shop, employee.name)[index]) || 0)),
            headers.map(() => 0)
          );
          return (
            <View key={employee.name} style={styles.group}>
              {/* Keep the employee heading, column heading and first data
                  row together. If they do not fit, react-pdf moves this
                  whole block to the next page instead of orphaning the
                  employee name at the bottom of the previous page. */}
              <View wrap={false}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{employeeIndex + 1}. {employeeLabel}</Text>
                  <Text style={styles.groupSummary}>บิลที่รับผิดชอบ {formatPdfNumber(employee.totalDocuments)} · อัปโหลด {formatPdfNumber(employee.totalUploaded)} รูป · คีย์บัญชี {formatPdfNumber(employee.totalJournals + employee.totalJournalsNoPhoto)} รายการ</Text>
                </View>
                <PdfTableRow cells={headers} header />
                {firstRow ? <PdfTableRow cells={firstRow} /> : null}
              </View>
              {remainingRows.map((row, rowIndex) => <PdfTableRow key={rowIndex} cells={row} />)}
              <PdfTableRow cells={["รวม", ...totals.slice(1).map(String)]} total />
              {detailsByEmployee[employeeIndex].total > 0 ? (
                <View>
                  <View wrap={false}>
                    <Text style={styles.detailTitle}>
                      เอกสารที่ตรงกับตัวกรอง ({formatPdfNumber(detailsByEmployee[employeeIndex].total)} รายการ)
                    </Text>
                    <PdfDetailRow cells={detailHeaders} header />
                  </View>
                  {detailsByEmployee[employeeIndex].shown.map((match, rowIndex) => (
                    <PdfDetailRow key={rowIndex} cells={detailCells(match)} />
                  ))}
                  {detailsByEmployee[employeeIndex].shown.length < detailsByEmployee[employeeIndex].total ? (
                    <Text style={styles.truncatedNote}>
                      แสดง {formatPdfNumber(detailsByEmployee[employeeIndex].shown.length)} รายการแรก (จำกัดทั้งไฟล์{" "}
                      {formatPdfNumber(MAX_DETAIL_ROWS)} รายการ) — ใส่เลขที่เอกสารเพื่อกรองให้แคบลง
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
        <View style={styles.footer} fixed>
          <Text>VAT Dashboard Status Monitor</Text>
          <Text render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function exportKpiPdf(options: {
  employees: KpiCombinedEmployee[];
  startDate: Date;
  endDate: Date;
  userName: string;
  /** When active, the PDF shows only the matching employees, shops and documents. */
  docSearch?: DocSearch;
}) {
  registerFonts();
  const startedAt = performance.now();
  console.info("[kpi-pdf] generation started", {
    employees: options.employees.length,
    shopRows: options.employees.reduce((total, employee) => total + employee.shopStats.length, 0),
  });
  const blob = await pdf(<KpiPdfDocument {...options} docSearch={options.docSearch ?? EMPTY_DOC_SEARCH} />).toBlob();
  console.info("[kpi-pdf] generation completed", {
    durationMs: Math.round(performance.now() - startedAt),
    bytes: blob.size,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `KPI_${stamp}.pdf`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
