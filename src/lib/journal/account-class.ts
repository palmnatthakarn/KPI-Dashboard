import { statusPalette, accentPalette, categoricalPalette } from "@/lib/design/tokens";

/**
 * Ported 1:1 from lib/models/account_class.dart.
 * Classifies a Journal's raw `accounttype` string (Thai or English) into
 * one of 6 buckets used for filtering, coloring, and KPI aggregation.
 */
export type AccountClass = "income" | "expenses" | "assets" | "liabilities" | "equity" | "unknown";

export function accountClassFromString(type?: string | null): AccountClass {
  if (!type) return "unknown";
  const normalized = type.toUpperCase();
  switch (normalized) {
    case "INCOME":
    case "รายได้":
      return "income";
    case "EXPENSES":
    case "รายจ่าย":
      return "expenses";
    case "ASSETS":
    case "สินทรัพย์":
      return "assets";
    case "LIABILITIES":
    case "หนี้สิน":
      return "liabilities";
    case "EQUITY":
    case "ทุน":
    case "ส่วนของผู้ถือหุ้น":
      return "equity";
    default:
      return "unknown";
  }
}

export function accountClassDisplayName(c: AccountClass): string {
  switch (c) {
    case "income":
      return "รายได้";
    case "expenses":
      return "รายจ่าย";
    case "assets":
      return "สินทรัพย์";
    case "liabilities":
      return "หนี้สิน";
    case "equity":
      return "ทุน";
    case "unknown":
      return "-";
  }
}

/**
 * Account-class color. Returns the `strong` shade because callers render it as
 * TEXT on a light tint of itself — the lighter shades used previously sat at
 * roughly 2.5:1 against white and failed WCAG AA.
 *
 * Income/expense reuse the status palette (money in is "safe", money out reads
 * as the exceeded color); the rest are neutral category colors.
 */
export function accountClassColor(c: AccountClass): string {
  switch (c) {
    case "income":
      return statusPalette.safe.strong;
    case "expenses":
    case "liabilities":
      return statusPalette.exceeded.strong;
    case "assets":
      return accentPalette.info.strong;
    case "equity":
      return categoricalPalette[4];
    case "unknown":
      return accentPalette.neutral.strong;
  }
}

export function typeDisplay(accountType?: string | null): string {
  return accountClassDisplayName(accountClassFromString(accountType));
}

export function typeColor(accountType?: string | null): string {
  return accountClassColor(accountClassFromString(accountType));
}
