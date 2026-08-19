"use client";

import { Document, Font, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { ReportTableData } from "@/types/report";

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

const styles = StyleSheet.create({
  page: { padding: 28, paddingBottom: 34, fontFamily: "Sarabun", fontSize: 8, color: "#0f172a" },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center" },
  subtitle: { marginTop: 3, marginBottom: 12, fontSize: 9, color: "#64748b", textAlign: "center" },
  table: { borderTopWidth: 0.7, borderLeftWidth: 0.7, borderColor: "#94a3b8" },
  row: { flexDirection: "row", minHeight: 24 },
  headerRow: { backgroundColor: "#1e3a8a", color: "#ffffff" },
  highlightRow: { backgroundColor: "#dbeafe" },
  cell: { flex: 1, padding: 5, borderRightWidth: 0.7, borderBottomWidth: 0.7, borderColor: "#94a3b8", justifyContent: "center" },
  headerText: { fontWeight: 700, textAlign: "center" },
  highlightText: { fontWeight: 700 },
  footer: { position: "absolute", left: 28, right: 28, bottom: 12, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#64748b" },
});

function TableRow({
  cells,
  header = false,
  highlighted = false,
}: {
  cells: string[];
  header?: boolean;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.row, header ? styles.headerRow : {}, highlighted ? styles.highlightRow : {}]} wrap={false}>
      {cells.map((cell, index) => (
        <View key={index} style={styles.cell}>
          <Text style={header ? styles.headerText : highlighted ? styles.highlightText : {}}>{cell || "-"}</Text>
        </View>
      ))}
    </View>
  );
}

function TablePdfDocument({
  title,
  subtitle,
  table,
}: {
  title: string;
  subtitle?: string;
  table: ReportTableData;
}) {
  const highlighted = new Set(table.highlightRows ?? []);
  return (
    <Document title={title} author="VAT Dashboard">
      <Page size="A4" orientation={table.headers.length > 4 ? "landscape" : "portrait"} style={styles.page} wrap>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.table}>
          <TableRow cells={table.headers} header />
          {table.rows.map((row, index) => (
            <TableRow key={index} cells={row} highlighted={highlighted.has(index)} />
          ))}
        </View>
        <View style={styles.footer} fixed>
          <Text>VAT Dashboard Status Monitor</Text>
          <Text render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "_").trim() || "report";
}

export async function exportTablePdf(options: {
  title: string;
  subtitle?: string;
  table: ReportTableData;
  filename?: string;
}) {
  registerFonts();
  const blob = await pdf(<TablePdfDocument {...options} />).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(options.filename ?? options.title)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
