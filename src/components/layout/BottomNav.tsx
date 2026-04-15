"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Star,
  Briefcase,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "總覽", icon: LayoutDashboard },
  { href: "/journal", label: "日誌", icon: BookOpen },
  { href: "/positions", label: "持倉", icon: Briefcase },
  { href: "/results", label: "成果", icon: BarChart3 },
  { href: "/watchlist", label: "自選股", icon: Star },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
