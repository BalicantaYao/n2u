import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "台股日誌 | Taiwan Trading Journal",
  description: "台灣股市交易日誌，支援 TWSE / TPEX，損益分析、走勢圖表一覽",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-background text-foreground">
        <Sidebar />
        <main className="ml-56 min-h-screen">
          {children}
        </main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
