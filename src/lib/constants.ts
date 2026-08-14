/**
 * App-wide business & API constants.
 * Ported 1:1 from lib/core/constants/app_constants.dart in the original Flutter app.
 * Adjust threshold values here — changes take effect across the entire app.
 */
export const AppConstants = {
  // ── Dashboard status thresholds (income / deposit amounts in THB) ──────
  /** Shops with income BELOW this value are classified as "safe". */
  safeIncomeMax: 1_000_000,

  /** Shops with income in [warningIncomeMin, warningIncomeMax] -> "warning". */
  warningIncomeMin: 1_000_000,
  warningIncomeMax: 1_800_000,

  /** Shops with income ABOVE this value are classified as "exceeded". */
  exceededIncomeMin: 1_800_000,

  /** Deposit threshold used for stats counters (success / warning / error). */
  successDepositThreshold: 1_000_000,
  warningDepositMin: 500_000,
  warningDepositMax: 1_000_000,

  // ── API / Pagination ────────────────────────────────────────────────────
  /** Maximum journal records fetched per request. */
  journalPageSize: 1000,
} as const;

export type ShopStatus = "safe" | "warning" | "exceeded";

/** Mirrors the income-based status classification used across dashboard/shop widgets. */
export function classifyIncomeStatus(income: number): ShopStatus {
  if (income < AppConstants.warningIncomeMin) return "safe";
  if (income <= AppConstants.warningIncomeMax) return "warning";
  return "exceeded";
}

// ── Responsive breakpoints (mirrors ResponsiveHelper) ─────────────────────
export const Breakpoints = {
  mobile: 600,
  tablet: 800,
  desktop: 1200,
  largeDesktop: 1600,
} as const;
