import { apiClient } from "@/lib/api/client";
import { getAllGLJournals } from "@/lib/api/journal-service";
import { selectShop } from "@/lib/api/multi-shop-service";
import type { Journal } from "@/types/journal";
import type { ReportQuery, ReportTableData } from "@/types/report";

type ApiItem = Record<string, unknown>;
const money = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function n(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function amount(value: unknown): string {
  const valueAsNumber = n(value);
  return valueAsNumber == null ? "" : money.format(valueAsNumber);
}

function apiRows(items: ApiItem[]): ReportTableData {
  const rows: string[][] = [];
  const highlightRows: number[] = [];
  for (const item of items) {
    const type = String(item.type ?? "");
    const depth = n(item.depth) ?? 0;
    rows.push([
      `${"  ".repeat(depth)}${String(item.accountname ?? "-")}`,
      String(item.accountcode ?? "-") || "-",
      amount(item.balance),
    ]);
    if (item.isBold === true || type !== "account") highlightRows.push(rows.length - 1);
  }
  return { headers: ["รายการ", "รหัสบัญชี", "จำนวนเงิน"], rows, highlightRows };
}

function rootItems(payload: unknown): ApiItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (Array.isArray(data)) return data.filter((item): item is ApiItem => !!item && typeof item === "object");
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    const list = nested.items ?? nested.data ?? nested.rows;
    if (Array.isArray(list)) return list.filter((item): item is ApiItem => !!item && typeof item === "object");
  }
  return [];
}

async function fetchStatement(path: string, params: Record<string, string>): Promise<ReportTableData> {
  const { data } = await apiClient.get(path, { params });
  return apiRows(rootItems(data));
}

async function fetchTrialBalance(query: ReportQuery): Promise<ReportTableData> {
  await selectShop(query.shopId);
  const response = await getAllGLJournals({
    shopId: query.shopId,
    startDate: query.startDate,
    endDate: query.endDate,
    limit: 5000,
  });
  const grouped = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>();
  for (const journal of response.data ?? []) {
    const code = journal.accountcode ?? "-";
    const name = journal.accountname ?? "-";
    const key = `${code}|${name}`;
    const entry = grouped.get(key) ?? { code, name, type: journal.accounttype ?? "-", debit: 0, credit: 0 };
    entry.debit += journal.debit ?? 0;
    entry.credit += journal.credit ?? 0;
    grouped.set(key, entry);
  }
  const entries = [...grouped.values()].sort((a, b) => a.code.localeCompare(b.code));
  const rows = entries.map((item) => [item.code, item.name, item.type, item.debit ? money.format(item.debit) : "-", item.credit ? money.format(item.credit) : "-"]);
  rows.push(["รวมทั้งสิ้น", "", "", money.format(entries.reduce((sum, item) => sum + item.debit, 0)), money.format(entries.reduce((sum, item) => sum + item.credit, 0))]);
  return { headers: ["รหัสบัญชี", "ชื่อบัญชี", "หมวดบัญชี", "เดบิต", "เครดิต"], rows, highlightRows: [rows.length - 1] };
}

async function fetchTwelveMonths(query: ReportQuery): Promise<ReportTableData> {
  const { data } = await apiClient.get("/apireport/journal12columns/", { params: { endDate: `${query.endDate} 23:59:59`, shopid: query.shopId, shopname: "", taxid: "", address: "" } });
  const report = (data?.data ?? {}) as Record<string, any>;
  const months = Array.isArray(report.monthRange) ? report.monthRange : [];
  const keys = months.map((month: any) => String(month.key ?? ""));
  const labels = months.map((month: any) => `${month.displayName ?? ""} ${String(month.year ?? "").slice(-2)}`.trim());
  const rows: string[][] = [];
  const highlightRows: number[] = [];
  const add = (name: string, values: Record<string, unknown> = {}, code = "-", highlight = false) => {
    rows.push([name, code || "-", ...keys.map((key: string) => amount(values[key])), amount(values.total_amount ?? values.grandTotal)]);
    if (highlight) highlightRows.push(rows.length - 1);
  };
  const section = (title: string, key: string, totalTitle: string) => {
    add(title, {}, "-", true);
    const value = report[key];
    for (const item of Array.isArray(value?.items) ? value.items : []) add(String(item.accountname ?? "-"), item, String(item.accountcode ?? "-"));
    const summary = value?.summary;
    if (summary) add(totalTitle, { ...(summary.monthTotals ?? {}), grandTotal: summary.grandTotal }, "-", true);
  };
  section("รายได้", "revenue", "รวมรายได้");
  section("ต้นทุนขาย", "costOfSales", "รวมต้นทุนขาย");
  if (report.grossProfit) add("กำไรขั้นต้น", { ...(report.grossProfit.monthTotals ?? {}), grandTotal: report.grossProfit.grandTotal }, "-", true);
  section("ค่าใช้จ่าย", "expense", "รวมค่าใช้จ่าย");
  if (report.netProfit) add("กำไร(ขาดทุน)สุทธิ", { ...(report.netProfit.monthTotals ?? {}), grandTotal: report.netProfit.grandTotal }, "-", true);
  return { headers: ["รายการ", "รหัสบัญชี", ...labels, "รวม"], rows, highlightRows };
}

const GENERIC_REPORTS: Record<string, { path: string; params: (query: ReportQuery) => Record<string, string | number>; headers: string[]; fields: string[][] }> = {
  "บัญชีแยกประเภท": { path: "/gl/report/ledgeraccount", params: (q) => ({ startdate: q.startDate, enddate: q.endDate }), headers: ["รหัสบัญชี", "ชื่อบัญชี", "วันที่", "เลขที่เอกสาร", "รายละเอียด", "เครดิต", "เดบิต", "คงเหลือ"], fields: [["accountcode", "account_code", "code"], ["accountname", "account_name", "name"], ["docdate", "date", "createdat"], ["docno", "documentno", "document_no", "refno"], ["description", "remark", "details"], ["credit", "credit_amount"], ["debit", "debit_amount"], ["balance", "amount"]] },
  "กระดาษทำการ": { path: "/gl/report/trialbalancesheet", params: (q) => ({ startdate: q.startDate, enddate: q.endDate, ica: 0 }), headers: ["รหัสบัญชี", "ชื่อบัญชี", "เดบิต", "เครดิต", "คงเหลือ"], fields: [["accountcode", "account_code", "code"], ["accountname", "account_name", "name"], ["debit", "debit_amount"], ["credit", "credit_amount"], ["balance", "amount"]] },
  "รายงานรหัสบัญชี": { path: "/gl/chartofaccount", params: () => ({ limit: 2000, q: "", page: 1, sort: "accountcode:1" }), headers: ["รหัสบัญชี", "ชื่อบัญชี", "หมวด", "ระดับ", "สถานะ"], fields: [["accountcode", "account_code", "code"], ["accountname", "account_name", "name"], ["accountcategory", "category", "account_type"], ["accountlevel", "level"], ["status", "active"]] },
  "รายงานสถานะเจ้าหนี้": { path: "/debtaccount/creditor", params: () => ({ limit: 1000, q: "", page: 1, sort: "code:1" }), headers: ["รหัส", "ชื่อ", "เลขประจำตัวผู้เสียภาษี", "โทรศัพท์", "ยอดคงเหลือ"], fields: [["code", "creditorcode", "id"], ["name", "creditorname", "accountname"], ["taxid", "tax_id"], ["telephone", "tel", "phone"], ["balance", "amount", "debtamount"]] },
  "รายงานสถานะลูกหนี้": { path: "/debtaccount/debtor", params: () => ({ limit: 1000, q: "", page: 1, sort: "code:1" }), headers: ["รหัส", "ชื่อ", "เลขประจำตัวผู้เสียภาษี", "โทรศัพท์", "ยอดคงเหลือ"], fields: [["code", "debtorcode", "id"], ["name", "debtorname", "accountname"], ["taxid", "tax_id"], ["telephone", "tel", "phone"], ["balance", "amount", "debtamount"]] },
};

async function fetchGeneric(query: ReportQuery, definition: (typeof GENERIC_REPORTS)[string]): Promise<ReportTableData> {
  await selectShop(query.shopId);
  const { data } = await apiClient.get(definition.path, { params: definition.params(query) });
  const items = rootItems(data);
  const rows = items.map((item) => definition.fields.map((aliases, columnIndex) => {
    const value = aliases.map((alias) => item[alias]).find((candidate) => candidate != null);
    const header = definition.headers[columnIndex];
    return /เดบิต|เครดิต|คงเหลือ|ยอด/.test(header) ? (amount(value) || "-") : String(value ?? "-");
  }));
  return { headers: definition.headers, rows };
}

export async function fetchFinancialStatement(query: ReportQuery): Promise<ReportTableData> {
  if (query.reportType === "งบทดลอง") return fetchTrialBalance(query);
  if (query.reportType === "งบกำไรขาดทุน") return fetchStatement("/apireport/income-statement", { shopid: query.shopId, fromdate: query.startDate, enddate: query.endDate });
  if (query.reportType === "งบกำไรขาดทุน 12 เดือน") return fetchTwelveMonths(query);
  if (query.reportType === "งบแสดงฐานะทางการเงิน") return fetchStatement("/apireport/balance-sheet", { shopid: query.shopId, enddate: query.endDate, shopname: "", taxid: "", address: "" });
  const generic = GENERIC_REPORTS[query.reportType];
  if (generic) return fetchGeneric(query, generic);
  throw new Error("รายงานนี้ยังไม่ได้เชื่อมต่อข้อมูลในระบบ");
}
