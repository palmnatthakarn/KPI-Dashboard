import { redirect } from "next/navigation";

/**
 * There's no standalone "Documents" page/route in the Flutter source —
 * documents_page.dart is unreachable dead code (no nav entry, never
 * pushed). The real image gallery (ImageGalleryDialog) opens as a modal
 * from the Dashboard's shop table, not a dedicated route. Redirect anyone
 * with the old link/bookmark to /dashboard.
 */
export default function Page() {
  redirect("/dashboard");
}
