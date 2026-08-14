/**
 * Ported 1:1 from lib/models/doc_details.dart, pagination.dart, dashboard_summary.dart.
 */

export interface ShopName {
  code?: string;
  name?: string;
  isauto?: boolean;
  isdelete?: boolean;
}

export interface MonthlyData {
  deposit?: number;
  withdraw?: number;
}

export interface RecordedBy {
  name?: string;
  employee_id?: string;
}

export interface DailyTransactionEntry {
  timestamp?: string;
  deposit?: number;
  withdraw?: number;
  note?: string;
  ref?: string;
  recorded_by?: RecordedBy;
}

export interface ResponsiblePerson {
  name?: string;
  employee_id?: string;
  role?: string;
  email?: string;
  phone?: string;
  line_id?: string;
}

/** Loosely-typed row shape used in DocDetails.dailyTransactions (built from Journal fields). */
export interface DailyTransactionRaw {
  doc_datetime?: string;
  doc_no?: string;
  account_type?: string;
  credit?: number;
  debit?: number;
  account_name?: string;
  description?: string;
}

export interface DocDetails {
  shopid?: string;
  shopname?: string;
  names?: ShopName[];
  monthly_summary?: Record<string, MonthlyData>;
  daily?: DailyTransactionEntry[];
  responsible?: ResponsiblePerson;
  backup_responsible?: ResponsiblePerson;
  created_at?: string;
  updated_at?: string;
  timezone?: string;
  daily_images?: { category?: string; subcategory?: string; imageUrl?: string }[];
  daily_transactions?: DailyTransactionRaw[];

  // Multi-shop-summary API fields
  dailyAverage?: number;
  monthlyAverage?: number;
  yearlyAverage?: number;
  localImageCount?: number;
}

// ── Derived getters, mirrors the Dart getters on DocDetails ─────────────────

export function totalDeposit(shop: DocDetails): number {
  if (!shop.monthly_summary) return 0;
  return Object.values(shop.monthly_summary).reduce((sum, m) => sum + (m.deposit ?? 0), 0);
}

export function totalWithdraw(shop: DocDetails): number {
  if (!shop.monthly_summary) return 0;
  return Object.values(shop.monthly_summary).reduce((sum, m) => sum + (m.withdraw ?? 0), 0);
}

export function imageCount(shop: DocDetails): number {
  if (shop.localImageCount != null) return shop.localImageCount;
  if (!shop.daily_images) return 0;
  return shop.daily_images.filter((i) => !!i.imageUrl).length;
}

/** Extract display name: Thai name from `names[]` > `shopname` > shopid fallback. */
export function extractShopName(shop: DocDetails, shopId: string): string {
  if (shop.names && shop.names.length > 0) {
    const thai = shop.names.find((n) => n.code === "th") ?? shop.names[0];
    if (thai?.name) return thai.name;
  }
  if (shop.shopname) return shop.shopname;
  return shopId;
}

export interface Pagination {
  currentpage: number;
  pagesize: number;
  totalpages: number;
  totalrecords: number;
  hasnext: boolean;
  hasprevious: boolean;
}

export interface DashboardSummary {
  totalshop: number;
  doctotal: number;
  docsuccess: number;
  docwarning: number;
  docerror: number;
  timestamp: string;
  success_rate: number;
  warning_rate: number;
  error_rate: number;
}
