import { BaseReportPage } from "@/components/reports/base-report-page";

const REPORT_TYPES = [
  "รายงานภาษีซื้อ",
  "รายงานภาษีขาย",
  "ภาษีหัก ณ ที่จ่าย(ภ.ง.ด.3)",
  "ภาษีหัก ณ ที่จ่าย(ภ.ง.ด.53)",
  "ภาษีถูกหัก ณ ที่จ่าย",
];

export default function TaxPage() {
  return <BaseReportPage title="รายงานภาษี (Tax Reports)" reportTypes={REPORT_TYPES} />;
}
