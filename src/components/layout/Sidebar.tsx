"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Briefcase,
  BarChart3,
  StickyNote,
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
  { href: "/memos", labelKey: "nav.memos", icon: StickyNote },
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

      {/* User info + Logout */}
      {session?.user && (
        <div className="px-3 py-3 border-t">
          <div className="flex items-center gap-3 px-2">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                className="rounded-full shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                {session.user.name?.charAt(0) ?? "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={t("auth.logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
