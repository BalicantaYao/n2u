import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HtmlLangUpdater } from "@/components/layout/HtmlLangUpdater";
import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Nothing 2 You | Taiwan Trading Journal",
  description: "Nothing 2 You — 台灣股市交易日誌，支援 TWSE / TPEX，損益分析、走勢圖表一覽",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-background text-foreground">
        <SessionProvider>
          <HtmlLangUpdater />
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
