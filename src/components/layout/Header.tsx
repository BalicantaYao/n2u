"use client";

import { useEffect, useState } from "react";
import { formatDate, isMarketOpen } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Header({ title }: { title: string }) {
  const [marketOpen, setMarketOpen] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    setMarketOpen(isMarketOpen());
    setToday(formatDate(new Date()));
    const id = setInterval(() => setMarketOpen(isMarketOpen()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="flex items-center gap-2 md:gap-3 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{today}</span>
        <Badge
          className={cn(
            "text-xs",
            marketOpen
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          )}
        >
          {marketOpen ? "開盤中" : "已收盤"}
        </Badge>
      </div>
    </header>
  );
}
