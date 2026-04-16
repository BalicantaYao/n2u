"use client";

import { create } from "zustand";
import type { Locale } from "@/locales";

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("locale");
    if (saved === "en" || saved === "zh-TW") return saved;
  }
  return "zh-TW";
}

export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: getInitialLocale(),
  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", locale);
      document.documentElement.lang = locale;
    }
    set({ locale });
  },
}));
