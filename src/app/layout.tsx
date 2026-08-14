import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "VAT Dashboard Status Monitor",
  description: "ระบบติดตามสถานะภาษีมูลค่าเพิ่ม (VAT) พร้อมระบบอนุมัติไฟล์แบบ Real-time",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
