"use client";

import { useLocaleStore } from "@/store/useLocaleStore";
import { locales } from "@/locales";
import type { Locale } from "@/locales";

/**
 * Resolve a dot-separated key from a nested object.
 * e.g. getNestedValue(obj, "nav.dashboard") -> obj.nav.dashboard
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

/**
 * Interpolate {{key}} placeholders with values.
 * e.g. interpolate("Hello {{name}}", { name: "World" }) -> "Hello World"
 */
function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = values[key];
    return val != null ? String(val) : `{{${key}}}`;
  });
}

/**
 * Translation function factory. Returns a `t(key, values?)` function.
 */
function createT(locale: Locale) {
  const translations = locales[locale] as unknown as Record<string, unknown>;
  return function t(key: string, values?: Record<string, string | number>): string {
    const raw = getNestedValue(translations, key);
    return interpolate(raw, values);
  };
}

/**
 * React hook: returns { t, locale, setLocale }
 */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = createT(locale);
  return { t, locale, setLocale };
}
