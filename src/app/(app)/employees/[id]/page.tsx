import { redirect } from "next/navigation";

/**
 * Legacy compatibility route.
 *
 * The previous Flutter app exposed employee-detail navigation, but this
 * Next.js port currently presents the combined employee KPI view at /kpi.
 */
export default function Page() {
  redirect("/kpi");
}
