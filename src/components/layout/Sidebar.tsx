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

const navItems = [
  { href: "/dashboard", label: "總覽", icon: LayoutDashboard },
  { href: "/journal", label: "交易日誌", icon: BookOpen },
  { href: "/positions", label: "持倉分析", icon: Briefcase },
  { href: "/results", label: "交易成果", icon: BarChart3 },
  { href: "/charts", label: "走勢圖", icon: LineChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

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

      {/* User info + logout */}
      <div className="px-3 py-4 border-t">
        {session?.user && (
          <div className="flex items-center gap-3 px-2">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {session.user.name?.[0] ?? "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {session.user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {session.user.email}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="登出"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
