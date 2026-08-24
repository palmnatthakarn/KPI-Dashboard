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

const headers = [
  "ร้าน / งาน / รายการ",
  "บิลที่รับผิดชอบ",
  "อัปโหลดโดยคนนี้",
  "รอตรวจสอบ",
  "ผ่าน",
  "ไม่ผ่าน",
  "ไม่บันทึก",
  "ไม่ต้องอนุมัติ",
  "ต้องบันทึก (งาน)",
  "บันทึกแล้ว (งาน)",
  "คงเหลือ",
  "เสร็จ",
  "คีย์",
  "คีย์ (ไม่มีรูป)",
  "คีย์รวม",
  "ตรวจสอบ",
  "แก้ไข",
];

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
  firstCell: { width: "20%", padding: 2.5, borderRightWidth: 0.35, borderColor: "#94a3b8", justifyContent: "center" },
  cell: { width: "5%", padding: 2, borderRightWidth: 0.35, borderColor: "#94a3b8", justifyContent: "center", textAlign: "right" },
  headerText: { fontWeight: 700, textAlign: "center", fontSize: 5.8 },
  footer: { position: "absolute", left: 22, right: 22, bottom: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 6, color: "#64748b" },
});

function shopCells(shop: KpiCombinedEmployee["shopStats"][number]): string[] {
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
  ];
}

function PdfTableRow({ cells, header = false, total = false, context = false }: { cells: string[]; header?: boolean; total?: boolean; context?: boolean }) {
  return (
    <View style={[styles.row, header ? styles.headerRow : {}, total ? styles.totalRow : {}, context ? styles.contextRow : {}]} wrap={false}>
      {cells.map((cell, index) => (
        <View key={index} style={index === 0 ? styles.firstCell : styles.cell}>
          <Text style={header ? styles.headerText : {}}>
            {!header && index === 0 ? `${formatPdfCell(cell, false)}\u00A0` : formatPdfCell(cell, header)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function KpiPdfDocument({ employees, startDate, endDate, userName }: { employees: KpiCombinedEmployee[]; startDate: Date; endDate: Date; userName: string }) {
  const date = (value: Date) => value.toLocaleDateString("th-TH");
  return (
    <Document title="รายงาน KPI" author={userName}>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <Text style={styles.title}>รายงาน KPI</Text>
        <Text style={styles.subtitle}>ช่วงข้อมูล {date(startDate)} ถึง {date(endDate)}</Text>
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
          const rows = employee.shopStats.map(shopCells);
          const [firstRow, ...remainingRows] = rows;
          const totals = employee.shopStats.reduce(
            (acc, shop) => acc.map((value, index) => index === 0 ? 0 : value + (Number(shopCells(shop)[index]) || 0)),
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

export async function exportKpiPdf(options: { employees: KpiCombinedEmployee[]; startDate: Date; endDate: Date; userName: string }) {
  registerFonts();
  const startedAt = performance.now();
  console.info("[kpi-pdf] generation started", {
    employees: options.employees.length,
    shopRows: options.employees.reduce((total, employee) => total + employee.shopStats.length, 0),
  });
  const blob = await pdf(<KpiPdfDocument {...options} />).toBlob();
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
