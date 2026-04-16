import zhTW from "./zh-TW";
import en from "./en";

export type Locale = "zh-TW" | "en";

// Use a recursive string type to avoid literal type mismatch between locales
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

type TranslationShape = DeepStringify<typeof zhTW>;

export const locales: Record<Locale, TranslationShape> = {
  "zh-TW": zhTW,
  en,
};

export const localeNames: Record<Locale, string> = {
  "zh-TW": "中文",
  en: "EN",
};

export type Translations = TranslationShape;
