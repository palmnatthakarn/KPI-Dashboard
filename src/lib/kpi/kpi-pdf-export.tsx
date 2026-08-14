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
import type {
  KpiCombinedEmployee,
  KpiCombinedJournalItem,
  KpiCombinedTaskItem,
} from "@/types/kpi-combined";

Font.register({
  family: "Sarabun",
  fonts: [
    { src: "/fonts/Sarabun-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Sarabun-Bold.ttf", fontWeight: 700 },
  ],
});

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

const styles = StyleSheet.create({
  page: { padding: 22, fontFamily: "Sarabun", fontSize: 6.5, color: "#1f2937" },
  title: { fontSize: 15, fontWeight: 700, textAlign: "center" },
  subtitle: { marginTop: 2, fontSize: 8, color: "#64748b", textAlign: "center" },
  meta: { marginTop: 8, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 7 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#111827", marginBottom: 8 },
  group: { marginBottom: 10 },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 3, borderBottomWidth: 0.7, borderBottomColor: "#111827" },
  groupName: { fontSize: 9, fontWeight: 700 },
  groupSummary: { fontSize: 7, color: "#64748b" },
  row: { flexDirection: "row", borderLeftWidth: 0.35, borderBottomWidth: 0.35, borderColor: "#94a3b8", minHeight: 18 },
  headerRow: { backgroundColor: "#e2e8f0", minHeight: 34 },
  totalRow: { backgroundColor: "#eff6ff" },
  contextRow: { color: "#ea580c" },
  firstCell: { width: "16%", padding: 2.5, borderRightWidth: 0.35, borderColor: "#94a3b8", justifyContent: "center" },
  cell: { width: "5.25%", padding: 2, borderRightWidth: 0.35, borderColor: "#94a3b8", justifyContent: "center", textAlign: "right" },
  headerText: { fontWeight: 700, textAlign: "center", fontSize: 5.8 },
  footer: { position: "absolute", left: 22, right: 22, bottom: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 6, color: "#64748b" },
});

type PdfRow = { cells: string[]; context?: boolean };

function uniqueJournals(items: KpiCombinedJournalItem[]) {
  return new Set(items.map((item) => item.docNo.trim() || `${item.keyedAt?.toISOString() ?? ""}|${item.accountName}`)).size;
}

function taskRow(task: KpiCombinedTaskItem): PdfRow {
  const journals = task.journalEntries.filter((journal) => journal.createdBy && (!task.isOwner || journal.createdBy.trim() === task.ownerBy.trim()));
  const keyed = uniqueJournals(journals);
  return {
    context: !task.isOwner,
    cells: [
      `  งาน: ${task.taskName.trim() || task.taskCode}`,
      String(task.totalDocument),
      String(task.uploadedByThisEmployee),
      String(task.waitingVerify),
      String(task.passed),
      String(task.cancelled),
      String(task.notRecorded),
      String(task.notRequiredApproval),
      String(task.requiredToRecord),
      String(task.recorded),
      String(task.remaining),
      String(task.completed),
      String(keyed),
      "0",
      String(keyed),
      String(journals.filter((item) => item.checkedBy).length),
      String(journals.filter((item) => item.updatedBy).length),
    ],
  };
}

function journalRow(journal: KpiCombinedJournalItem, orphan = false): PdfRow {
  const hasEvidence = Boolean(journal.resolvedTaskGuid?.trim() || journal.documentRef?.trim());
  return {
    cells: [
      `    ${orphan ? "รายการไม่ผูกงาน" : "รายการ"}: ${journal.docNo || "-"} · ${journal.accountName || "-"}`,
      "1", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0",
      journal.createdBy && hasEvidence ? "1" : "0",
      journal.createdBy && !hasEvidence ? "1" : "0",
      journal.createdBy ? "1" : "0",
      journal.checkedBy ? "1" : "0",
      journal.updatedBy ? "1" : "0",
    ],
  };
}

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

function employeeRows(employee: KpiCombinedEmployee): PdfRow[] {
  const rows: PdfRow[] = [];
  for (const shop of employee.shopStats) {
    rows.push({ cells: shopCells(shop) });
    for (const task of shop.tasks) {
      rows.push(taskRow(task));
      rows.push(...task.journalEntries.map((journal) => journalRow(journal)));
    }
    rows.push(...shop.orphanJournalEntries.map((journal) => journalRow(journal, true)));
  }
  return rows;
}

function PdfTableRow({ cells, header = false, total = false, context = false }: { cells: string[]; header?: boolean; total?: boolean; context?: boolean }) {
  return (
    <View style={[styles.row, header ? styles.headerRow : {}, total ? styles.totalRow : {}, context ? styles.contextRow : {}]} wrap={false}>
      {cells.map((cell, index) => (
        <View key={index} style={index === 0 ? styles.firstCell : styles.cell}>
          <Text style={header ? styles.headerText : {}}>{cell}</Text>
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
          const rows = employeeRows(employee);
          const totals = employee.shopStats.reduce(
            (acc, shop) => acc.map((value, index) => index === 0 ? 0 : value + (Number(shopCells(shop)[index]) || 0)),
            headers.map(() => 0)
          );
          return (
            <View key={employee.name} style={styles.group}>
              <View style={styles.groupHeader} wrap={false}>
                <Text style={styles.groupName}>{employeeIndex + 1}. {getDisplayName(employee.name)}</Text>
                <Text style={styles.groupSummary}>บิลที่รับผิดชอบ {employee.totalDocuments} · อัปโหลด {employee.totalUploaded} รูป · คีย์บัญชี {employee.totalJournals + employee.totalJournalsNoPhoto} รายการ</Text>
              </View>
              <PdfTableRow cells={headers} header />
              {rows.map((row, rowIndex) => <PdfTableRow key={rowIndex} cells={row.cells} context={row.context} />)}
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
  const blob = await pdf(<KpiPdfDocument {...options} />).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `KPI_${stamp}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
