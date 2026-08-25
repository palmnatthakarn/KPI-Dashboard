"use client";

import { BaseReportPage } from "@/components/reports/base-report-page";
import { fetchPayablesReport } from "@/lib/reports/payables-report-service";

const REPORT_TYPES = ["วิเคราะห์อายุเจ้าหนี้ (AP Aging)", "สรุปยอดซื้อ (Purchase Summary)"];

export default function PayablesPage() {
  return (
    <BaseReportPage
      title="เจ้าหนี้และการซื้อ (Payables & Purchase)"
      reportTypes={REPORT_TYPES}
      dataLoader={fetchPayablesReport}
    />
  );
}
