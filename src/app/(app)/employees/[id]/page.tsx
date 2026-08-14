import { redirect } from "next/navigation";

/**
 * EmployeeDetailPage (employee_detail_page.dart) is unreachable dead code
 * in the Flutter source — confirmed via grep, zero instantiations anywhere.
 * Employee data now lives inline in the KPI table (expandable rows), not a
 * dedicated detail route. Redirect anyone with the old link to /kpi.
 */
export default function Page() {
  redirect("/kpi");
}
