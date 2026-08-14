import { BaseReportPage } from "@/components/reports/base-report-page";

const REPORT_TYPES = [
  "วิเคราะห์อายุลูกหนี้ (AR Aging)",
  "สรุปยอดขายตามสินค้า / ตามลูกค้า (Sales Summary)",
  "การ์ดลูกหนี้รายตัว (Customer Ledger)",
];

export default function ReceivablesPage() {
  return <BaseReportPage title="ลูกหนี้และการขาย (Receivables & Sales)" reportTypes={REPORT_TYPES} />;
}
