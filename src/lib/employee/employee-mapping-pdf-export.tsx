"use client";

import { Document, Font, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

Font.register({
  family: "Sarabun",
  fonts: [
    { src: "/fonts/Sarabun-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Sarabun-Bold.ttf", fontWeight: 700 },
  ],
});

export interface EmployeeMappingPdfRow {
  displayName: string;
  email: string;
  status: "mapped" | "unmapped";
}

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Sarabun", fontSize: 10, color: "#0f172a" },
  title: { fontSize: 18, fontWeight: 700, textAlign: "center" },
  subtitle: { marginTop: 4, fontSize: 10, color: "#64748b", textAlign: "center" },
  meta: { marginTop: 14, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: "#475569" },
  summary: { marginBottom: 12, flexDirection: "row", gap: 8 },
  summaryCard: { flex: 1, borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 8, padding: 8, backgroundColor: "#f8fafc" },
  summaryLabel: { fontSize: 8, color: "#64748b" },
  summaryValue: { marginTop: 2, fontSize: 14, fontWeight: 700 },
  table: { borderWidth: 0.7, borderColor: "#cbd5e1", borderRadius: 8, overflow: "hidden" },
  row: { flexDirection: "row", minHeight: 28, borderBottomWidth: 0.7, borderBottomColor: "#e2e8f0" },
  headerRow: { backgroundColor: "#0f172a", color: "#ffffff" },
  cell: { padding: 7, justifyContent: "center", borderRightWidth: 0.7, borderRightColor: "#e2e8f0" },
  indexCell: { width: "7%", textAlign: "center" },
  nameCell: { width: "33%" },
  emailCell: { width: "42%" },
  statusCell: { width: "18%", borderRightWidth: 0 },
  headerText: { fontWeight: 700, fontSize: 9 },
  statusMapped: { color: "#15803d", fontWeight: 700 },
  statusUnmapped: { color: "#64748b", fontWeight: 700 },
  empty: { padding: 22, textAlign: "center", color: "#64748b" },
  footer: { position: "absolute", left: 28, right: 28, bottom: 12, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#64748b" },
});

function formatDateTime(value: Date) {
  return value.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmployeeMappingPdfDocument({
  rows,
  modeLabel,
  search,
}: {
  rows: EmployeeMappingPdfRow[];
  modeLabel: string;
  search: string;
}) {
  const mappedCount = rows.filter((row) => row.status === "mapped").length;
  const unmappedCount = rows.length - mappedCount;

  return (
    <Document title="รายชื่อพนักงาน" author="VAT Dashboard">
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>รายชื่อพนักงาน</Text>
        <Text style={styles.subtitle}>รายการชื่อแสดงผลและ Email สำหรับ KPI / รายงาน</Text>
        <View style={styles.meta}>
          <Text>โหมด: {modeLabel}</Text>
          <Text>วันที่พิมพ์: {formatDateTime(new Date())}</Text>
        </View>
        {search.trim() ? <Text style={[styles.subtitle, { marginBottom: 10 }]}>คำค้นหา: {search.trim()}</Text> : null}

        <View style={styles.summary}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>ทั้งหมด</Text>
            <Text style={styles.summaryValue}>{rows.length.toLocaleString("th-TH")}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>ตั้งชื่อแล้ว</Text>
            <Text style={styles.summaryValue}>{mappedCount.toLocaleString("th-TH")}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>รอตั้งชื่อ</Text>
            <Text style={styles.summaryValue}>{unmappedCount.toLocaleString("th-TH")}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} fixed>
            <View style={[styles.cell, styles.indexCell]}><Text style={styles.headerText}>#</Text></View>
            <View style={[styles.cell, styles.nameCell]}><Text style={styles.headerText}>ชื่อแสดงผล</Text></View>
            <View style={[styles.cell, styles.emailCell]}><Text style={styles.headerText}>Email</Text></View>
            <View style={[styles.cell, styles.statusCell]}><Text style={styles.headerText}>สถานะ</Text></View>
          </View>
          {rows.length === 0 ? (
            <Text style={styles.empty}>ไม่พบรายการพนักงานตามตัวกรองปัจจุบัน</Text>
          ) : (
            rows.map((row, index) => (
              <View key={`${row.email}-${index}`} style={styles.row} wrap={false}>
                <View style={[styles.cell, styles.indexCell]}><Text>{index + 1}</Text></View>
                <View style={[styles.cell, styles.nameCell]}><Text>{row.displayName}</Text></View>
                <View style={[styles.cell, styles.emailCell]}><Text>{row.email}</Text></View>
                <View style={[styles.cell, styles.statusCell]}>
                  <Text style={row.status === "mapped" ? styles.statusMapped : styles.statusUnmapped}>
                    {row.status === "mapped" ? "ตั้งชื่อแล้ว" : "รอตั้งชื่อ"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>VAT Dashboard Status Monitor</Text>
          <Text render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function exportEmployeeMappingPdf(options: { rows: EmployeeMappingPdfRow[]; modeLabel: string; search: string }) {
  const blob = await pdf(<EmployeeMappingPdfDocument {...options} />).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `employee_list_${new Date().toISOString().slice(0, 10)}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
