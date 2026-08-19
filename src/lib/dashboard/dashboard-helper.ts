import { AppConstants } from "@/lib/constants";
import type { DocDetails } from "@/types/shop";

/**
 * Ported from lib/utils/dashboard_helper.dart + the filtering logic inside
 * DashboardBloc._filterShops / _getIncomeForPeriod.
 */

export type ShopStatusFilter = "all" | "safe" | "warning" | "exceeded";

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
