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
  Eye,
  ListChecks,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useUIStore } from "@/store/useUIStore";
import { LanguageToggle } from "./LanguageToggle";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/watchlist", labelKey: "nav.watchlist", icon: Eye },
  { href: "/journal", labelKey: "nav.journal", icon: BookOpen },
  { href: "/positions", labelKey: "nav.positions", icon: Briefcase },
  { href: "/futures-basis", labelKey: "nav.futuresBasis", icon: Scale },
  { href: "/results", labelKey: "nav.results", icon: BarChart3 },
  { href: "/observations", labelKey: "nav.observations", icon: ListChecks },
  { href: "/memos", labelKey: "nav.memos", icon: StickyNote },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useT();
  const { data: session } = useSession();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "hidden md:flex fixed left-0 top-0 z-40 h-screen border-r bg-card flex-col transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          "flex items-center border-b py-5",
          collapsed ? "justify-center px-2" : "justify-between px-5 gap-2"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="h-6 w-6 text-primary shrink-0" />
            <span className="font-bold text-lg tracking-tight truncate">
              {t("sidebar.logo")}
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav
        className={cn(
          "flex-1 py-4 space-y-1",
          collapsed ? "px-2" : "px-3"
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          const label = t(item.labelKey);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm font-medium transition-colors",
                collapsed
                  ? "justify-center px-2 py-2.5"
                  : "gap-3 px-3 py-2.5",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Language toggle */}
      <div className={cn(collapsed ? "px-2 pb-2 flex justify-center" : "px-3 pb-2")}>
        <LanguageToggle compact={collapsed} />
      </div>

      {/* User info + Logout */}
      {session?.user && (
        <div className={cn("border-t", collapsed ? "px-2 py-3" : "px-3 py-3")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {session.user.name?.charAt(0) ?? "?"}
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title={t("auth.logout")}
                aria-label={t("auth.logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </aside>
  );
}
