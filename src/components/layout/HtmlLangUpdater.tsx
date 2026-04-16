"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/store/useLocaleStore";

export function HtmlLangUpdater() {
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
