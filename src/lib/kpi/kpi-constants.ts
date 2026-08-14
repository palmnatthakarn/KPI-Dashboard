/** Ported verbatim from lib/pages/kpi/kpi_constants.dart. */
export const KpiColors = {
  totalDocuments: "#6366F1",
  waitingKey: "#64748B",
  waitingFix: "#3B82F6",
  assigned: "#86595E",
  waitingVerify: "#F59E0B",
  completed: "#10B981",
  cancelled: "#EF4444",
  baseColor: "#1E293B",

  cardBackground: "#FFFFFF",
  alternateRow: "#F8FAFC",
  border: "#E2E8F0",
  lightBorder: "#F1F5F9",
  headerBackground: "#F8FAFC",

  primaryText: "#1E293B",
  secondaryText: "#374151",
  mutedText: "#94A3B8",

  avatarColors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#6366F1"],

  delayUpload: "#EF4444",
  delayVerify: "#F59E0B",
  delayRecord: "#F97316",

  incentivePass: "#10B981",
  incentiveFail: "#EF4444",

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
  contextValue: "#EA580C",
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
