"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  LineChart,
  TrendingUp,
  Briefcase,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/journal", labelKey: "nav.journal", icon: BookOpen },
  { href: "/positions", labelKey: "nav.positions", icon: Briefcase },
  { href: "/results", labelKey: "nav.results", icon: BarChart3 },
  { href: "/charts", labelKey: "nav.charts", icon: LineChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useT();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-56 border-r bg-card flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <TrendingUp className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg tracking-tight">{t("sidebar.logo")}</span>
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
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Language toggle + Footer */}
      <div className="px-3 pb-2">
        <LanguageToggle />
      </div>
      <div className="px-5 py-4 border-t text-xs text-muted-foreground">
        <p>{t("sidebar.footer1")}</p>
        <p className="mt-0.5">{t("sidebar.footer2")}</p>
      </div>
    </aside>
  );
}
