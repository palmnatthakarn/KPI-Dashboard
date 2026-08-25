import { BaseReportPage } from "@/components/reports/base-report-page";

const REPORT_TYPES = ["บัญชีคุมสินค้า (Stock Card)", "สรุปความเคลื่อนไหวสินค้า (Stock Movement)"];

export default function InventoryPage() {
  return <BaseReportPage title="สินค้าคงคลัง (Inventory)" reportTypes={REPORT_TYPES} />;
}
