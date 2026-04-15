"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  LineChart,
  Star,
  TrendingUp,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "總覽", icon: LayoutDashboard },
  { href: "/journal", label: "交易日誌", icon: BookOpen },
  { href: "/positions", label: "持倉分析", icon: Briefcase },
  { href: "/charts", label: "走勢圖", icon: LineChart },
  { href: "/watchlist", label: "自選股", icon: Star },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-56 border-r bg-card flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <TrendingUp className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg tracking-tight">台股日誌</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t text-xs text-muted-foreground">
        <p>台灣股市交易日誌</p>
        <p className="mt-0.5">TWSE / TPEX</p>
      </div>
    </aside>
  );
}
