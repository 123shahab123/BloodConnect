import type { Language } from "../types";

export type LocalizedText<T = string> = {
  en?: T | null;
  fa?: T | null;
  ps?: T | null;
};

export function pickLang<T>(lang: Language | string, text: LocalizedText<T>): T {
  const key = lang === "ps" ? "ps" : lang === "en" ? "en" : "fa";
  return (
    text[key] ??
    text.fa ??
    text.en ??
    text.ps ??
    ""
  ) as T;
}

export function makeLangPicker(lang: Language | string) {
  return (fa: string, en: string, ps?: string) => pickLang(lang, { fa, en, ps });
}

export function localeForLanguage(lang: Language | string): string {
  if (lang === "en") return "en-US";
  if (lang === "ps") return "ps-AF";
  return "fa-IR";
}
