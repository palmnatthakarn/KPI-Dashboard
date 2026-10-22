import { Document, Font, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

/**
 * The upload report PDF, kept free of app imports, `window` and Firebase so it
 * can render inside a Web Worker. Everything it shows arrives as plain text in
 * `UploadPdfInput`, prepared on the main thread.
 *
 * Rows are packed into pages here rather than left to react-pdf: its own page
 * splitting re-lays-out every remaining row at each page break, which grew to
 * minutes for a thousand rows. Packed pages render in time linear to the rows.
 */

export interface UploadPdfUploader {
  label: string;
  summary: string;
  shopRows: string[][];
  /** null when the uploader has a single shop. */
  totalRow: string[] | null;
  setTitle: string;
  setRows: string[][];
  /** Shown after the set rows when some were left out. */
  setNote: string | null;
}

export interface UploadPdfInput {
  rangeLabel: string;
  summaryLine: string;
  userName: string;
  printedDate: string;
  uploaders: UploadPdfUploader[];
}

type Column = { label: string; width: number; align: "left" | "right" };

// Widths are fractions of the content width.
const SHOP_COLUMNS: Column[] = [
  { label: "ร้าน", width: 0.46, align: "left" },
  { label: "ชุดเอกสาร", width: 0.14, align: "right" },
  { label: "รูป", width: 0.14, align: "right" },
  { label: "อัปโหลดล่าสุด", width: 0.26, align: "right" },
];

const SET_COLUMNS: Column[] = [
  { label: "ชุดเอกสาร / ไฟล์", width: 0.24, align: "left" },
  { label: "ร้าน", width: 0.2, align: "left" },
  { label: "ตำแหน่ง (งาน · เลขที่เอกสาร)", width: 0.32, align: "left" },
  { label: "รูป", width: 0.06, align: "right" },
  { label: "อัปโหลดเมื่อ", width: 0.18, align: "right" },
];

// A4 landscape is 841.89 × 595.28 pt.
const PAGE_PADDING = 22;
const PAGE_BOTTOM = 30;
const CONTENT_WIDTH = 841.89 - PAGE_PADDING * 2;
// Kept below the real content height so an underestimated row only rarely
// spills onto react-pdf's own overflow page.
const PAGE_BUDGET = 595.28 - PAGE_PADDING - PAGE_BOTTOM - 18;

const FONT_SIZE = 7.5;
const LINE_HEIGHT = FONT_SIZE * 1.25;
const ROW_MIN_HEIGHT = 15;
const CELL_PADDING = 2.5;

const HEIGHTS = { reportHeader: 82, heading: 22, setTitle: 18, note: 12, groupGap: 12 };

/** Estimated row height: lines needed by its fullest cell (Thai glyphs ≈ 0.5em wide). */
function rowHeight(columns: Column[], cells: string[], fontSize = FONT_SIZE): number {
  const lines = Math.max(
    1,
    ...cells.map((cell, index) => {
      const capacity = Math.max(1, Math.floor((columns[index].width * CONTENT_WIDTH - CELL_PADDING * 2) / (fontSize * 0.52)));
      return Math.ceil(cell.length / capacity);
    })
  );
  return Math.max(ROW_MIN_HEIGHT, lines * LINE_HEIGHT + CELL_PADDING * 2);
}

type Block =
  | { kind: "reportHeader" }
  | { kind: "heading"; label: string; summary: string; continued: boolean }
  | { kind: "setTitle"; text: string }
  | { kind: "row"; columns: Column[]; cells: string[]; header?: boolean; total?: boolean }
  | { kind: "note"; text: string }
  | { kind: "gap" };

const headerRow = (columns: Column[]): Block => ({ kind: "row", columns, cells: columns.map((c) => c.label), header: true });

function blockHeight(block: Block): number {
  switch (block.kind) {
    case "reportHeader":
      return HEIGHTS.reportHeader;
    case "heading":
      return HEIGHTS.heading;
    case "setTitle":
      return HEIGHTS.setTitle;
    case "note":
      return HEIGHTS.note;
    case "gap":
      return HEIGHTS.groupGap;
    case "row":
      return rowHeight(block.columns, block.cells, block.header ? 6.8 : FONT_SIZE);
  }
}

/**
 * Packs the report into pages. A table that runs onto a new page gets its
 * uploader heading and column header repeated, and a heading is never left
 * at the foot of a page without its header and first row.
 */
export function paginateUploadPdf(input: UploadPdfInput): Block[][] {
  const pages: Block[][] = [];
  let page: Block[] = [{ kind: "reportHeader" }];
  let used = HEIGHTS.reportHeader;

  const newPage = () => {
    pages.push(page);
    page = [];
    used = 0;
  };
  const place = (blocks: Block[]) => {
    for (const block of blocks) {
      page.push(block);
      used += blockHeight(block);
    }
  };
  const fits = (blocks: Block[]) => used + blocks.reduce((sum, block) => sum + blockHeight(block), 0) <= PAGE_BUDGET;

  for (const uploader of input.uploaders) {
    const heading = (continued: boolean): Block => ({ kind: "heading", label: uploader.label, summary: uploader.summary, continued });

    const table = (lead: Block[], columns: Column[], rows: Block[]) => {
      // Lead blocks travel with the column header and the first row.
      let opening = [...lead, headerRow(columns), ...rows.slice(0, 1)];
      if (!fits(opening) && used > 0) {
        newPage();
        // A table starting a fresh page still says whose it is.
        if (lead[0]?.kind !== "heading") opening = [heading(true), ...opening];
      }
      place(opening);
      for (const row of rows.slice(1)) {
        if (!fits([row])) {
          newPage();
          place([heading(true), headerRow(columns)]);
        }
        place([row]);
      }
    };

    if (page.length > 0 && page[page.length - 1].kind !== "reportHeader") place([{ kind: "gap" }]);
    const shopRows: Block[] = [
      ...uploader.shopRows.map((cells): Block => ({ kind: "row", columns: SHOP_COLUMNS, cells })),
      ...(uploader.totalRow ? [{ kind: "row", columns: SHOP_COLUMNS, cells: uploader.totalRow, total: true } as Block] : []),
    ];
    table([heading(false)], SHOP_COLUMNS, shopRows);

    if (uploader.setRows.length > 0) {
      table(
        [{ kind: "setTitle", text: uploader.setTitle }],
        SET_COLUMNS,
        uploader.setRows.map((cells): Block => ({ kind: "row", columns: SET_COLUMNS, cells }))
      );
    }
    if (uploader.setNote) {
      if (!fits([{ kind: "note", text: uploader.setNote }]) && used > 0) newPage();
      place([{ kind: "note", text: uploader.setNote }]);
    }
  }
  if (page.length > 0) pages.push(page);
  return pages;
}

const styles = StyleSheet.create({
  page: { paddingTop: PAGE_PADDING, paddingHorizontal: PAGE_PADDING, paddingBottom: PAGE_BOTTOM, fontFamily: "Sarabun", fontSize: FONT_SIZE, color: "#1f2937" },
  title: { fontSize: 15, fontWeight: 700, textAlign: "center" },
  subtitle: { marginTop: 2, fontSize: 8, color: "#64748b", textAlign: "center" },
  summary: { marginTop: 2, fontSize: 8, color: "#1d4ed8", textAlign: "center" },
  meta: { marginTop: 8, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 7 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#111827", marginBottom: 8 },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 3, marginBottom: 2, borderBottomWidth: 0.7, borderBottomColor: "#111827" },
  groupName: { width: "55%", paddingRight: 6, fontSize: 9, fontWeight: 700 },
  groupSummary: { width: "45%", fontSize: 7, color: "#64748b", textAlign: "right" },
  row: { flexDirection: "row", borderLeftWidth: 0.35, borderBottomWidth: 0.35, borderColor: "#94a3b8", minHeight: ROW_MIN_HEIGHT },
  headerRow: { backgroundColor: "#e2e8f0", borderTopWidth: 0.35 },
  totalRow: { backgroundColor: "#eff6ff", fontWeight: 700 },
  cell: { padding: CELL_PADDING, borderRightWidth: 0.35, borderColor: "#94a3b8", justifyContent: "center" },
  headerText: { fontWeight: 700, fontSize: 6.8 },
  setTitle: { marginTop: 6, marginBottom: 2, fontSize: 7.5, fontWeight: 700, color: "#334155" },
  note: { marginTop: 2, fontSize: 6.5, color: "#b45309" },
  gap: { height: HEIGHTS.groupGap },
  footer: { position: "absolute", left: PAGE_PADDING, right: PAGE_PADDING, bottom: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 6, color: "#64748b" },
});

function BlockView({ block, input }: { block: Block; input: UploadPdfInput }) {
  switch (block.kind) {
    case "reportHeader":
      return (
        <View>
          <Text style={styles.title}>รายงานรูปที่อัปโหลด</Text>
          <Text style={styles.subtitle}>{input.rangeLabel}</Text>
          <Text style={styles.summary}>{input.summaryLine}</Text>
          <View style={styles.meta}>
            <Text>ผู้จัดพิมพ์ {input.userName || "ผู้ใช้งาน"}</Text>
            <Text>วันที่จัดพิมพ์ {input.printedDate}</Text>
          </View>
          <View style={styles.rule} />
        </View>
      );
    case "heading":
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>
            {block.label}
            {block.continued ? " (ต่อ)" : ""}
          </Text>
          <Text style={styles.groupSummary}>{block.summary}</Text>
        </View>
      );
    case "setTitle":
      return <Text style={styles.setTitle}>{block.text}</Text>;
    case "note":
      return <Text style={styles.note}>{block.text}</Text>;
    case "gap":
      return <View style={styles.gap} />;
    case "row":
      return (
        <View style={[styles.row, block.header ? styles.headerRow : {}, block.total ? styles.totalRow : {}]}>
          {block.cells.map((cell, index) => (
            <View key={index} style={[styles.cell, { width: `${block.columns[index].width * 100}%` }]}>
              {/* A trailing NBSP keeps react-pdf from clipping the last Thai glyph. */}
              <Text style={[block.header ? styles.headerText : {}, { textAlign: block.columns[index].align }]}>{`${cell} `}</Text>
            </View>
          ))}
        </View>
      );
  }
}

let fontsRegisteredFrom: string | null = null;

/** Registers the Thai font from `fontBaseUrl` (the app origin), once per thread. */
function registerSarabun(fontBaseUrl: string) {
  if (fontsRegisteredFrom === fontBaseUrl) return;
  Font.register({
    family: "Sarabun",
    fonts: [
      { src: `${fontBaseUrl}/fonts/Sarabun-Regular.ttf`, fontWeight: 400 },
      { src: `${fontBaseUrl}/fonts/Sarabun-Bold.ttf`, fontWeight: 700 },
    ],
  });
  fontsRegisteredFrom = fontBaseUrl;
}

export async function renderUploadPdf(input: UploadPdfInput, fontBaseUrl: string): Promise<Blob> {
  registerSarabun(fontBaseUrl);
  const pages = paginateUploadPdf(input);
  return pdf(
    <Document title="รายงานรูปที่อัปโหลด" author={input.userName}>
      {pages.map((blocks, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page}>
          {blocks.map((block, blockIndex) => (
            <BlockView key={blockIndex} block={block} input={input} />
          ))}
          <View style={styles.footer} fixed>
            <Text>VAT Dashboard Status Monitor</Text>
            <Text render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  ).toBlob();
}
