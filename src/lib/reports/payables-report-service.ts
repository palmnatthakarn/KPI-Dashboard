import { selectShop } from "@/lib/api/multi-shop-service";
import { getAllPurchases } from "@/lib/api/purchase-service";
import type { Purchase } from "@/types/purchase";
import type { ReportQuery, ReportTableData } from "@/types/report";

const AP_AGING = "วิเคราะห์อายุเจ้าหนี้ (AP Aging)";
const PURCHASE_SUMMARY = "สรุปยอดซื้อ (Purchase Summary)";
const money = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface VendorTotal {
  code: string;
  name: string;
  purchase: number;
  vat: number;
  total: number;
  aging: [number, number, number, number];
}

function amount(value: number): string {
  return value === 0 ? "-" : money.format(value);
}

function purchaseDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ageInDays(value: string | undefined, endDate: string): number {
  const documentDate = purchaseDate(value);
  const reportDate = purchaseDate(`${endDate}T23:59:59`);
  if (!documentDate || !reportDate) return 0;
  return Math.max(0, Math.floor((reportDate.getTime() - documentDate.getTime()) / 86_400_000));
}

function groupByVendor(purchases: Purchase[], endDate: string): VendorTotal[] {
  const vendors = new Map<string, VendorTotal>();

  for (const purchase of purchases) {
    const code = purchase.vendor_code?.trim() || "-";
    const name = purchase.vendor_name?.trim() || "ไม่ระบุชื่อเจ้าหนี้";
    const key = `${code}\u0000${name}`;
    const vendor = vendors.get(key) ?? {
      code,
      name,
      purchase: 0,
      vat: 0,
      total: 0,
      aging: [0, 0, 0, 0],
    };
    const purchaseAmount = purchase.purchase_amount ?? 0;
    const vatAmount = purchase.vat_amount ?? 0;
    const totalAmount = purchase.total_amount ?? purchaseAmount + vatAmount;
    const days = ageInDays(purchase.doc_datetime, endDate);

    vendor.purchase += purchaseAmount;
    vendor.vat += vatAmount;
    vendor.total += totalAmount;
    vendor.aging[days === 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : 3] += totalAmount;
    vendors.set(key, vendor);
  }

  return [...vendors.values()].sort((a, b) => a.code.localeCompare(b.code, "th"));
}

function agingTable(vendors: VendorTotal[]): ReportTableData {
  const rows = vendors.map((vendor) => [
    vendor.code,
    vendor.name,
    ...vendor.aging.map(amount),
    amount(vendor.total),
  ]);
  const totals = vendors.reduce<[number, number, number, number, number]>(
    (sum, vendor) => [
      sum[0] + vendor.aging[0],
      sum[1] + vendor.aging[1],
      sum[2] + vendor.aging[2],
      sum[3] + vendor.aging[3],
      sum[4] + vendor.total,
    ],
    [0, 0, 0, 0, 0],
  );
  if (rows.length > 0) rows.push(["รวม", "", ...totals.map(amount)]);

  return {
    headers: ["รหัสเจ้าหนี้", "ชื่อเจ้าหนี้", "ยังไม่ถึงกำหนด", "เกิน 1-30 วัน", "เกิน 31-60 วัน", "เกิน 60 วันขึ้นไป", "รวมทั้งสิ้น"],
    rows,
    highlightRows: rows.length > 0 ? [rows.length - 1] : [],
  };
}

function purchaseSummaryTable(vendors: VendorTotal[]): ReportTableData {
  const rows = vendors.map((vendor) => [
    vendor.code,
    vendor.name,
    amount(vendor.purchase),
    amount(vendor.vat),
    amount(vendor.total),
  ]);
  const totals = vendors.reduce(
    (sum, vendor) => ({
      purchase: sum.purchase + vendor.purchase,
      vat: sum.vat + vendor.vat,
      total: sum.total + vendor.total,
    }),
    { purchase: 0, vat: 0, total: 0 },
  );
  if (rows.length > 0) rows.push(["รวม", "", amount(totals.purchase), amount(totals.vat), amount(totals.total)]);

  return {
    headers: ["รหัสเจ้าหนี้", "ชื่อเจ้าหนี้", "มูลค่าซื้อ", "ภาษีซื้อ", "มูลค่ารวม"],
    rows,
    highlightRows: rows.length > 0 ? [rows.length - 1] : [],
  };
}

export async function fetchPayablesReport(query: ReportQuery): Promise<ReportTableData> {
  await selectShop(query.shopId);
  const response = await getAllPurchases({
    branchSync: query.shopId,
    startDate: query.startDate,
    endDate: query.endDate,
    limit: 5000,
  });
  const vendors = groupByVendor(response.purchases ?? [], query.endDate);

  if (query.reportType === AP_AGING) return agingTable(vendors);
  if (query.reportType === PURCHASE_SUMMARY) return purchaseSummaryTable(vendors);
  throw new Error("รายงานนี้ยังไม่ได้เชื่อมต่อข้อมูลในระบบ");
}
