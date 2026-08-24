import { AppConstants } from "@/lib/constants";
import type { DocDetails } from "@/types/shop";

/**
 * Ported from lib/utils/dashboard_helper.dart + the filtering logic inside
 * DashboardBloc._filterShops / _getIncomeForPeriod.
 */

export type ShopStatusFilter = "all" | "safe" | "warning" | "exceeded";

/**
 * Single source of truth for status colors — mirrors the `status.*` tokens in
 * tailwind.config.ts. Every component that colors something by shop status
 * (stat cards, filter chips, table rows) must read from here instead of
 * hardcoding its own hex value, or the same status ends up rendered in
 * different shades across the UI.
 *
 * `icon` = decorative use (icons, borders, backgrounds) where WCAG text
 * contrast doesn't apply. `text` = a darker shade for on-white text/numbers,
 * chosen to clear WCAG AA (4.5:1) for normal-size text.
 */
export const STATUS_COLORS: Record<"safe" | "warning" | "exceeded", { icon: string; text: string }> = {
  safe: { icon: "#16A34A", text: "#15803D" },
  warning: { icon: "#D97706", text: "#B45309" },
  exceeded: { icon: "#DC2626", text: "#B91C1C" },
};

/** Sum of all monthly `deposit` values — used as the "yearly income" figure. */
export function getIncomeForPeriod(shop: DocDetails): number {
  if (!shop.monthly_summary) return 0;
  return Object.values(shop.monthly_summary).reduce((sum, m) => sum + (m.deposit ?? 0), 0);
}

/** Yearly income used for status classification: prefers the API's `yearlyAverage`, else sums monthly deposits. */
export function yearlyAmount(shop: DocDetails): number {
  if (shop.yearlyAverage != null) return shop.yearlyAverage;
  return getIncomeForPeriod(shop);
}

export function getShopCountByStatus(shops: DocDetails[], status: ShopStatusFilter): number {
  if (shops.length === 0) return 0;
  if (status === "all") return shops.length;
  return shops.filter((shop) => statusForAmount(yearlyAmount(shop)) === status).length;
}

/**
 * The equal-length period immediately before `range`, used for the trend
 * comparison on the stat tiles.
 *
 * The comparison has to be a second API call: the multi-shop-summary endpoint
 * returns one aggregate per shop for the requested range, not a time series,
 * so there is no earlier data already in hand to diff against.
 */
export function previousDateRange(range: { start: string; end: string }): {
  start: string;
  end: string;
} {
  const start = parseIsoDate(range.start);
  const end = parseIsoDate(range.end);

  // A whole calendar month compares against the whole previous calendar month.
  // Equal-length arithmetic would otherwise pit March (31 days) against
  // 29 Jan–28 Feb, which is defensible statistically but reads as a bug to
  // someone who picked "March" and expected "February".
  if (isWholeCalendarMonth(start, end)) {
    const previousMonth = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    return {
      start: toIsoDate(previousMonth),
      end: toIsoDate(new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)),
    };
  }

  // Otherwise keep the periods the same length so the comparison is fair.
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const previousEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  const previousStart = new Date(
    previousEnd.getFullYear(),
    previousEnd.getMonth(),
    previousEnd.getDate() - dayCount + 1
  );

  return { start: toIsoDate(previousStart), end: toIsoDate(previousEnd) };
}

/** True when the range covers exactly the 1st to the last day of one month. */
function isWholeCalendarMonth(start: Date, end: Date): boolean {
  if (start.getDate() !== 1) return false;
  if (start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth()) return false;
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  return end.getDate() === lastDay;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Shop counts per status, used to diff one period against another. */
export function statusCounts(shops: DocDetails[]): Record<"safe" | "warning" | "exceeded", number> {
  return {
    safe: getShopCountByStatus(shops, "safe"),
    warning: getShopCountByStatus(shops, "warning"),
    exceeded: getShopCountByStatus(shops, "exceeded"),
  };
}

export interface DocumentCounts {
  total: number;
  requiredToRecord: number;
  recorded: number;
}

export function getDocumentCounts(shops: DocDetails[]): DocumentCounts {
  const counts: DocumentCounts = { total: 0, requiredToRecord: 0, recorded: 0 };
  if (shops.length === 0) return counts;

  for (const shop of shops) {
    if (shop.localImageCount != null) counts.total += shop.localImageCount;
  }
  return counts;
}

/** Filters + searches shops, mirrors DashboardBloc._filterShops. */
export function filterShops(
  shops: DocDetails[],
  searchQuery: string,
  selectedFilter: ShopStatusFilter
): DocDetails[] {
  const trimmedQuery = searchQuery.trim().toLowerCase();

  return shops.filter((shop) => {
    let matchesSearch = trimmedQuery.length === 0;
    if (!matchesSearch) {
      if (shop.shopid?.toLowerCase().includes(trimmedQuery)) matchesSearch = true;
      if (!matchesSearch && shop.shopname?.toLowerCase().includes(trimmedQuery)) matchesSearch = true;
      if (!matchesSearch && shop.names) {
        matchesSearch = shop.names.some((n) => n.name?.toLowerCase().includes(trimmedQuery));
      }
    }

    if (!matchesSearch) return false;
    if (selectedFilter === "all") return true;
    return statusForAmount(yearlyAmount(shop)) === selectedFilter;
  });
}

/** K/M compact amount formatting, mirrors _formatAmount in branch_data_source.dart. */
export function formatAmountCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  return amount.toFixed(2);
}

/** Yearly-amount -> status color, mirrors _getYearlyColor / _buildStatusIndicator thresholds. */
export function statusForAmount(amount: number): "safe" | "warning" | "exceeded" {
  if (amount > AppConstants.exceededIncomeMin) return "exceeded";
  if (amount >= AppConstants.warningIncomeMin) return "warning";
  return "safe";
}
