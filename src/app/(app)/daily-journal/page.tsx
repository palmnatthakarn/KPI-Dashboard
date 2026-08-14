import { BaseReportPage } from "@/components/reports/base-report-page";

const REPORT_TYPES = ["ทุกสมุดรายวัน", "ทั่วไป", "จ่าย", "รับ", "ซื้อ", "ขาย", "ธนาคาร", "ไม่บันทึกบัญชี"];

export default function DailyJournalPage() {
  return (
    <BaseReportPage
      title="สมุดรายวัน (Daily Journal)"
      reportTypes={REPORT_TYPES}
      defaultReportType="ทุกสมุดรายวัน"
    />
  );
}
