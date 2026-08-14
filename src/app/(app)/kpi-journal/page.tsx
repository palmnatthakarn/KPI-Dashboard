import { redirect } from "next/navigation";

/**
 * The Flutter app merged the old separate KPI + KPI Journal pages into one
 * KpiCombinedPage in 2026 — there is no standalone "KPI Journal" route
 * anymore. Redirect anyone with the old link/bookmark to /kpi.
 */
export default function Page() {
  redirect("/kpi");
}
