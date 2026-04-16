"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  LineChart,
  TrendingUp,
  Briefcase,
  BarChart3,
  LogOut,
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
  const { data: session } = useSession();

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

      {/* Language toggle */}
      <div className="px-3 pb-2">
        <LanguageToggle />
      </div>

      {/* User section */}
      {session?.user && (
        <div className="px-3 py-3 border-t">
          <div className="flex items-center gap-2 px-2 py-1.5">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {session.user.name?.[0] ?? "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full mt-1"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.signOut")}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-4 border-t text-xs text-muted-foreground">
        <p>{t("sidebar.footer1")}</p>
        <p className="mt-0.5">{t("sidebar.footer2")}</p>
      </div>
    </aside>
  );
}
