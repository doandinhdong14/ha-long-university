import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "CRM KPI giáo viên – ĐH Hạ Long",
  description: "Hệ thống chấm KPI giáo viên Trường Đại học Hạ Long",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-muted">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
