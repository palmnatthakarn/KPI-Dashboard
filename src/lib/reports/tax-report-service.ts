import { apiClient } from "@/lib/api/client";
import type { ReportQuery, ReportTableData } from "@/types/report";

type ApiRow = Record<string, unknown>;

type TaxReportConfig = {
  path: string;
  params: Record<string, string>;
  headers: string[];
  fields: string[][];
};

const MONEY_HEADERS = [
  "ฐานภาษี",
  "ภาษี",
  "อัตราภาษี",
  "ภาษีที่หัก",
  "จำนวนเงิน",
  "ยกเว้นภาษี",
  "มูลค่าสินค้า",
  "จำนวนภาษี",
  "รวมทั้งสิ้น",
  "ยอด",
];

const VAT_TOTAL_KEYS = ["totalamount", "grandtotal", "netamount", "total"];
const VAT_KEYS = ["vatamount", "taxamount", "amountvat", "vat", "tax"];
const VAT_EXEMPT_KEYS = ["exceptvat", "exemptamount", "vat_exempt_amount", "nonvatamount", "zeroamount"];
const VAT_BASE_KEYS = ["vatbase", "baseamount", "vatbaseamount", "vatableamount", "amountbeforevat", "amount_before_vat"];

function firstValue(row: ApiRow, keys: string[]) {
  for (const key of keys) if (row[key] != null) return row[key];
  return undefined;
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "0").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractRows(payload: unknown): ApiRow[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as ApiRow;
  const data = root.data && typeof root.data === "object" ? root.data as ApiRow : undefined;
  const result = root.result && typeof root.result === "object" ? root.result as ApiRow : undefined;
  const candidates = [root.data, root.items, root.docs, root.rows, root.list, data?.data, data?.items, data?.docs, data?.rows, result?.data, result?.items];
  const rows = candidates.find(Array.isArray) as unknown[] | undefined;
  return (rows ?? []).filter((item): item is ApiRow => !!item && typeof item === "object" && !Array.isArray(item));
}

function detailValue(row: ApiRow, keys: string[], money = false) {
  const details = ["details", "detail", "taxdetails", "taxdetail"]
    .map((key) => row[key])
    .find(Array.isArray) as unknown[] | undefined;
  if (!details) return firstValue(row, keys);
  const values = details
    .filter((item): item is ApiRow => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item) => firstValue(item, keys))
    .filter((value) => value != null && String(value).trim() !== "")
    .map((value) => money ? formatMoney(value) : String(value));
  return values.length ? values.join("\n") : firstValue(row, keys);
}

function formatMoney(value: unknown) {
  const amount = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(amount) ? amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value);
}

function fieldValue(row: ApiRow, keys: string[], index: number) {
  if (keys.includes("__rowNumber")) return index + 1;
  if (keys.includes("__detailText")) return detailValue(row, keys.filter((key) => !key.startsWith("__")));
  if (keys.includes("__detailMoney")) return detailValue(row, keys.filter((key) => !key.startsWith("__")), true);
  if (keys.includes("conditiontaxtype")) {
    const value = String(firstValue(row, keys) ?? "");
    return ({ "1": "หัก ณ ที่จ่าย", "2": "ออกให้ตลอดไป", "3": "ออกให้ครั้งเดียว" } as Record<string, string>)[value] ?? value;
  }
  if (keys.includes("__vatProductAmount")) {
    const direct = firstValue(row, keys.filter((key) => !key.startsWith("__")));
    return direct ?? numberValue(firstValue(row, VAT_TOTAL_KEYS)) - numberValue(firstValue(row, VAT_KEYS)) - numberValue(firstValue(row, VAT_EXEMPT_KEYS));
  }
  if (keys.includes("__vatTotalAmount")) {
    const direct = firstValue(row, keys.filter((key) => !key.startsWith("__")));
    return direct ?? numberValue(firstValue(row, VAT_BASE_KEYS)) + numberValue(firstValue(row, VAT_KEYS)) + numberValue(firstValue(row, VAT_EXEMPT_KEYS));
  }
  return firstValue(row, keys);
}

function configFor(query: ReportQuery): TaxReportConfig {
  const common = { limit: "10", offset: "0", fromdate: `${query.startDate} 00:00:00`, todate: `${query.endDate} 23:59:59`, shopid: query.shopId, shopname: "", taxid: "", address: "" };
  const vatCommon = {
    headers: ["ลำดับ", "วันที่", "เลขที่ใบกำกับ", "เลขที่เอกสาร", "ชื่อผู้ขาย/ผู้ให้บริการ", "เลขประจำตัวผู้เสียภาษี", "สาขา"],
    fields: [["__rowNumber"], ["docdate", "taxdate", "vatdate", "date", "createdat"], ["vatdocno", "taxinvoice_no", "taxinvoiceno", "taxno", "invoiceno"], ["docno", "documentno", "document_no", "refno"], ["custname", "vendorname", "customername", "name"], ["custtaxid", "taxid", "tax_id"], ["branchcode", "branch", "branchname"]],
  };
  if (query.reportType === "รายงานภาษีซื้อ" || query.reportType === "รายงานภาษีขาย") {
    const purchase = query.reportType === "รายงานภาษีซื้อ";
    const year = String(Number(query.endDate.slice(0, 4)) + 543);
    const period = String(Number(query.endDate.slice(5, 7)));
    return { path: "/apireport/journalvat", params: { ...common, mode: purchase ? "0" : "1", year, period }, headers: [...vatCommon.headers, ...(purchase ? ["ยอดยกเว้นภาษี", "มูลค่าสินค้า", "จำนวนภาษี"] : ["ฐานภาษี", "ภาษี", "ยกเว้นภาษี"]), "รวมทั้งสิ้น", "ยื่นเพิ่มเติม"], fields: [...vatCommon.fields, ...(purchase ? [[...VAT_EXEMPT_KEYS], ["__vatProductAmount", ...VAT_BASE_KEYS], [...VAT_KEYS]] : [[...VAT_BASE_KEYS], [...VAT_KEYS], [...VAT_EXEMPT_KEYS]]), ["__vatTotalAmount", ...VAT_TOTAL_KEYS], ["additional", "isadditional", "submitadditional"]] };
  }
  if (query.reportType === "ภาษีถูกหัก ณ ที่จ่าย") {
    return { path: "/apireport/journaltaxdeduct", params: { ...common, taxtype: "0" }, headers: ["ลำดับ", "วันที่ได้รับ", "ชื่อ", "ที่อยู่", "เลขประจำตัวผู้เสียภาษี", "ประเภทเงินได้ที่จ่าย", "อัตราภาษี(%)", "จำนวนเงิน", "ภาษี"], fields: [["__rowNumber"], ["docdate", "paydate", "taxdate", "date"], ["custname", "customername", "vendorname", "name"], ["address"], ["custtaxid", "taxid", "tax_id"], ["__detailText", "description", "incometype", "taxtypename", "type"], ["__detailText", "taxrate"], ["__detailMoney", "taxbase", "amount", "baseamount", "payamount"], ["__detailMoney", "taxamount", "withholdingtax", "whtamount", "tax"]] };
  }
  const custtype = query.reportType.includes("53") ? "1" : "0";
  return { path: "/apireport/journaltax", params: { ...common, taxtype: "1", custtype }, headers: ["ลำดับ", "วันที่", "ชื่อ", "ที่อยู่", "เลขประจำตัวผู้เสียภาษี", "เลขที่หนังสือรับรอง", "รายละเอียด", "อัตราภาษี", "จำนวนเงินที่จ่าย", "ภาษีที่หัก", "เงื่อนไข"], fields: [["__rowNumber"], ["docdate", "paydate", "taxdate", "date"], ["custname", "customername", "vendorname", "name"], ["address"], ["custtaxid", "taxid", "tax_id"], ["taxdocno", "docno", "documentno"], ["description"], ["taxrate"], ["taxbase", "amount", "baseamount", "payamount"], ["taxamount", "withholdingtax", "whtamount", "tax"], ["conditiontaxtype"]] };
}

export async function fetchTaxReport(query: ReportQuery): Promise<ReportTableData> {
  const config = configFor(query);
  const response = await apiClient.get(config.path, { params: config.params });
  const payload = response.data as ApiRow;
  if (payload?.success === false) throw new Error(String(payload.message ?? payload.msg ?? `โหลด${query.reportType}ไม่สำเร็จ`));
  const items = extractRows(payload);
  const rows = items.map((item, rowIndex) => config.fields.map((keys, columnIndex) => {
    const value = fieldValue(item, keys, rowIndex);
    if (value == null || value === "") return "-";
    return MONEY_HEADERS.some((label) => config.headers[columnIndex]?.includes(label)) ? formatMoney(value) : String(value);
  }));
  return { headers: config.headers, rows, highlightRows: rows.flatMap((row, index) => row[0]?.includes("รวม") ? [index] : []) };
}
