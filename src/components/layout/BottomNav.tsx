"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Briefcase,
  BarChart3,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", shortKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/journal", labelKey: "nav.journal", shortKey: "nav.journalShort", icon: BookOpen },
  { href: "/positions", labelKey: "nav.positions", shortKey: "nav.positionsShort", icon: Briefcase },
  { href: "/results", labelKey: "nav.results", shortKey: "nav.resultsShort", icon: BarChart3 },
  { href: "/memos", labelKey: "nav.memos", shortKey: "nav.memosShort", icon: StickyNote },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useT();

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
              <span>{t(item.shortKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
