import { statusPalette, accentPalette, categoricalPalette } from "@/lib/design/tokens";

/**
 * Ported from lib/pages/kpi/kpi_constants.dart.
 *
 * The STRUCTURAL colors below (section backgrounds, borders, row tints) are
 * still verbatim from the Flutter source. The FOREGROUND colors are not: the
 * originals are mid-tone shades that get rendered as 8-9px status-chip text
 * and as white-on-color avatar initials, where they sat near 2.5:1 — far under
 * WCAG AA. They now resolve through the shared design tokens instead.
 */
export const KpiColors = {
  totalDocuments: categoricalPalette[0],
  waitingKey: accentPalette.neutral.strong,
  waitingFix: accentPalette.info.strong,
  assigned: "#86595E",
  waitingVerify: statusPalette.warning.strong,
  completed: statusPalette.safe.strong,
  cancelled: statusPalette.exceeded.strong,
  baseColor: "#1E293B",

  cardBackground: "#FFFFFF",
  alternateRow: "#F8FAFC",
  border: "#E2E8F0",
  lightBorder: "#F1F5F9",
  headerBackground: "#F8FAFC",

  primaryText: "#1E293B",
  secondaryText: "#374151",
  mutedText: "#64748B",

  /**
   * Avatar backgrounds, drawn with white initials on top. A color readable as
   * text on white is equally readable as white-on-itself (same contrast
   * formula), so the categorical palette is safe for both uses.
   */
  avatarColors: categoricalPalette,

  delayUpload: statusPalette.exceeded.strong,
  delayVerify: statusPalette.warning.strong,
  delayRecord: categoricalPalette[2],

  incentivePass: statusPalette.safe.strong,
  incentiveFail: statusPalette.exceeded.strong,

  /** จำนวน */
  section1Background: "#E0F2FE",
  /** รอตรวจสอบ/ผ่าน/ไม่ผ่าน/ไม่บันทึก/ไม่ต้องอนุมัติ */
  section2Background: "#FEF9C3",
  /** เอกสารที่ต้องบันทึก/บันทึก/คงเหลือ/เสร็จ */
  section3Background: "#DCFCE7",
  sectionDivider: "#94A3B8",
  /** บันทึกบัญชี (GL) group — distinct from the 3 task-workflow section colors above. */
  journalGroupBackground: "#E0E7FF",

  /** Contributor-row context values — informational only, not counted into that row's own total. */
  contextValue: categoricalPalette[2],
  /** Zero-value cells render as a muted em-dash instead of "0". */
  zeroValue: "#CBD5E1",
} as const;

export const KpiDimensions = {
  avatarRadius: 16,
  avatarSpacing: 12,
  cardBorderRadius: 16,
  rowPadding: 16,
  rowVerticalPadding: 16,
  headerPadding: 12,
  expandIconWidth: 40,
  avatarTotalWidth: 44,

  nameColWidth: 290,
  numColWidth: 90,
  numColCount: 15,
  expandColWidth: 50,
} as const;

export const KPI_DATE_FILTER_STORAGE_PREFIX = "kpi_combined";
