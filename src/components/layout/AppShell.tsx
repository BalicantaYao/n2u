"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-screen pb-safe-bottom md:pb-0 transition-[margin] duration-200 ease-out",
          collapsed ? "md:ml-16" : "md:ml-56"
        )}
      >
        {children}
      </main>
      <BottomNav />
    </>
  );
}
