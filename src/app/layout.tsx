import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_STORAGE_KEY } from "@/lib/theme";

export const metadata: Metadata = {
  title: "VAT Dashboard Status Monitor",
  description: "ระบบติดตามสถานะภาษีมูลค่าเพิ่ม (VAT) พร้อมระบบอนุมัติไฟล์แบบ Real-time",
};

/**
 * Applies the stored theme before first paint.
 *
 * This has to be an inline, synchronous script: React only attaches the class
 * after hydration, and a dark-mode user would get a full-brightness white flash
 * on every page load in the meantime. Kept deliberately tiny and dependency-free.
 */
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var mode = stored === "light" || stored === "dark"
      ? stored
      : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, mode);
    var dark = mode === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {
    /* private mode / storage blocked — fall through to the light default */
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The inline script mutates <html> before React hydrates, which React would
    // otherwise report as a server/client mismatch.
    <html lang="th" suppressHydrationWarning>
      <body className="antialiased">
        {/* First child of <body>, not a hand-written <head>: the App Router
            owns <head>, and declaring one here breaks the client-reference
            manifest for pages that only redirect (the root route 500s with
            "Cannot read properties of undefined (reading 'clientModules')").
            Placed here the script still runs before any content paints. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
