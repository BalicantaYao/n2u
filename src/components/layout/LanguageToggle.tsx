"use client";

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useT();

  function toggle() {
    setLocale(locale === "zh-TW" ? "en" : "zh-TW");
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title={locale === "zh-TW" ? "Switch to English" : "切換至中文"}
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{locale === "zh-TW" ? "EN" : "中"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
      title={locale === "zh-TW" ? "Switch to English" : "切換至中文"}
    >
      <Globe className="h-4 w-4 shrink-0" />
      <span>{locale === "zh-TW" ? "English" : "中文"}</span>
    </button>
  );
}
