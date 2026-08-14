import { BaseReportPage } from "@/components/reports/base-report-page";

const REPORT_TYPES = [
  "งบทดลอง",
  "งบกำไรขาดทุน",
  "งบกำไรขาดทุน 12 เดือน",
  "งบแสดงฐานะทางการเงิน",
  "บัญชีแยกประเภท",
  "กระดาษทำการ",
  "รายงานการบันทึกบัญชี",
  "รายงานรหัสบัญชี",
  "รายงานสถานะเจ้าหนี้",
  "รายงานสถานะลูกหนี้",
];

export default function FinancialStatementsPage() {
  return <BaseReportPage title="งบการเงิน (Financial Statements)" reportTypes={REPORT_TYPES} />;
}
