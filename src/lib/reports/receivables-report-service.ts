import { getAllSaleInvoiceDetails } from "@/lib/api/sale-invoice-detail-service";
import { getAllSaleInvoices } from "@/lib/api/sale-invoice-service";
import { selectShop } from "@/lib/api/multi-shop-service";
import type { SaleInvoiceDetail } from "@/types/sale-invoice-detail";
import type { SaleInvoice } from "@/types/sale-invoice";
import type { ReportQuery, ReportTableData } from "@/types/report";

const AR_AGING = "วิเคราะห์อายุลูกหนี้ (AR Aging)";
const SALES_SUMMARY = "สรุปยอดขายตามสินค้า / ตามลูกค้า (Sales Summary)";
const CUSTOMER_LEDGER = "การ์ดลูกหนี้รายตัว (Customer Ledger)";

const money = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const quantity = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

interface CustomerTotal {
  code: string;
  name: string;
  total: number;
  aging: [number, number, number, number];
}

interface ItemTotal {
  code: string;
  name: string;
  quantity: number;
  net: number;
  vat: number;
  total: number;
}

function amount(value: number): string {
  return value === 0 ? "-" : money.format(value);
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysOverdue(invoice: SaleInvoice, endDate: string): number {
  const dueDate = parseDate(invoice.due_date ?? invoice.doc_datetime);
  const reportDate = parseDate(`${endDate}T23:59:59`);
  if (!dueDate || !reportDate || dueDate >= reportDate) return 0;
  return Math.floor((reportDate.getTime() - dueDate.getTime()) / 86_400_000);
}

function isPaid(invoice: SaleInvoice): boolean {
  return /^(paid|complete|completed|ชำระแล้ว)$/i.test(invoice.payment_status?.trim() ?? "");
}

function groupByCustomer(invoices: SaleInvoice[], endDate: string): CustomerTotal[] {
  const customers = new Map<string, CustomerTotal>();

  for (const invoice of invoices) {
    if (isPaid(invoice)) continue;
    const code = invoice.customer_code?.trim() || "-";
    const name = invoice.customer_name?.trim() || "ไม่ระบุชื่อลูกค้า";
    const key = `${code}\u0000${name}`;
    const customer = customers.get(key) ?? { code, name, total: 0, aging: [0, 0, 0, 0] };
    const total = invoice.total_amount ?? (invoice.net_amount ?? 0) + (invoice.vat_amount ?? 0);
    const days = daysOverdue(invoice, endDate);

    customer.total += total;
    customer.aging[days === 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : 3] += total;
    customers.set(key, customer);
  }

  return [...customers.values()].sort((a, b) => a.code.localeCompare(b.code, "th"));
}

function agingTable(customers: CustomerTotal[]): ReportTableData {
  const rows = customers.map((customer) => [
    customer.code,
    customer.name,
    ...customer.aging.map(amount),
    amount(customer.total),
  ]);
  const totals = customers.reduce<[number, number, number, number, number]>(
    (sum, customer) => [
      sum[0] + customer.aging[0],
      sum[1] + customer.aging[1],
      sum[2] + customer.aging[2],
      sum[3] + customer.aging[3],
      sum[4] + customer.total,
    ],
    [0, 0, 0, 0, 0],
  );
  if (rows.length > 0) rows.push(["รวม", "", ...totals.map(amount)]);

  return {
    headers: ["รหัสลูกค้า", "ชื่อลูกค้า", "ยังไม่ถึงกำหนด", "เกิน 1-30 วัน", "เกิน 31-60 วัน", "เกิน 60 วันขึ้นไป", "รวมทั้งสิ้น"],
    rows,
    highlightRows: rows.length > 0 ? [rows.length - 1] : [],
  };
}

function salesSummaryTable(details: SaleInvoiceDetail[]): ReportTableData {
  const items = new Map<string, ItemTotal>();

  for (const detail of details) {
    const code = detail.item_code?.trim() || "-";
    const name = detail.item_name?.trim() || detail.item_description?.trim() || "ไม่ระบุชื่อสินค้า/บริการ";
    const key = `${code}\u0000${name}`;
    const item = items.get(key) ?? { code, name, quantity: 0, net: 0, vat: 0, total: 0 };
    const net = detail.net_amount ?? detail.line_total ?? 0;
    const vat = detail.vat_amount ?? 0;

    item.quantity += detail.quantity ?? 0;
    item.net += net;
    item.vat += vat;
    item.total += detail.total_amount ?? net + vat;
    items.set(key, item);
  }

  const sortedItems = [...items.values()].sort((a, b) => a.code.localeCompare(b.code, "th"));
  const rows = sortedItems.map((item) => [
    item.code,
    item.name,
    quantity.format(item.quantity),
    amount(item.net),
    amount(item.vat),
    amount(item.total),
  ]);
  const totals = sortedItems.reduce(
    (sum, item) => ({
      quantity: sum.quantity + item.quantity,
      net: sum.net + item.net,
      vat: sum.vat + item.vat,
      total: sum.total + item.total,
    }),
    { quantity: 0, net: 0, vat: 0, total: 0 },
  );
  if (rows.length > 0) {
    rows.push(["รวม", "", quantity.format(totals.quantity), amount(totals.net), amount(totals.vat), amount(totals.total)]);
  }

  return {
    headers: ["รหัสสินค้า/บริการ", "ชื่อสินค้า/บริการ", "จำนวนหน่วย", "ยอดขายก่อนภาษี", "ภาษีมูลค่าเพิ่ม", "ยอดขายสุทธิ"],
    rows,
    highlightRows: rows.length > 0 ? [rows.length - 1] : [],
  };
}

function customerLedgerTable(invoices: SaleInvoice[]): ReportTableData {
  const sortedInvoices = [...invoices].sort((a, b) => {
    const dateDifference = (parseDate(a.doc_datetime)?.getTime() ?? 0) - (parseDate(b.doc_datetime)?.getTime() ?? 0);
    return dateDifference || (a.doc_no ?? "").localeCompare(b.doc_no ?? "", "th");
  });
  let balance = 0;
  const rows = sortedInvoices.map((invoice) => {
    const debit = invoice.total_amount ?? (invoice.net_amount ?? 0) + (invoice.vat_amount ?? 0);
    balance += debit;
    const date = parseDate(invoice.doc_datetime);
    return [
      date ? shortDate.format(date) : "-",
      invoice.doc_no ?? "-",
      `ขาย${invoice.customer_name ? ` - ${invoice.customer_name}` : ""}`,
      amount(debit),
      "-",
      amount(balance),
    ];
  });
  if (rows.length > 0) rows.push(["ยอดยกไป", "", "", "", "", amount(balance)]);

  return {
    headers: ["วันที่", "เอกสาร", "คำอธิบาย", "เดบิต", "เครดิต", "คงเหลือ"],
    rows,
    highlightRows: rows.length > 0 ? [rows.length - 1] : [],
  };
}

export async function fetchReceivablesReport(query: ReportQuery): Promise<ReportTableData> {
  await selectShop(query.shopId);

  if (query.reportType === SALES_SUMMARY) {
    const response = await getAllSaleInvoiceDetails({
      branchSync: query.shopId,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: 5000,
    });
    return salesSummaryTable(response.saleInvoiceDetails ?? []);
  }

  const response = await getAllSaleInvoices({
    branchSync: query.shopId,
    startDate: query.startDate,
    endDate: query.endDate,
    limit: 5000,
  });
  const invoices = response.saleInvoices ?? [];

  if (query.reportType === AR_AGING) return agingTable(groupByCustomer(invoices, query.endDate));
  if (query.reportType === CUSTOMER_LEDGER) return customerLedgerTable(invoices);
  throw new Error("รายงานนี้ยังไม่ได้เชื่อมต่อข้อมูลในระบบ");
}
