import type { LanguageCode } from "./config";

const DEFAULT_RECOGNITION_LOCALE = "en-US";

const LOCALE_MAP: Record<LanguageCode, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ja: "ja-JP",
};

function baseLanguage(lng: string): string {
  return lng.split("-")[0]?.toLowerCase() ?? "en";
}

export function getSpeechLocale(lng: string | null | undefined): string {
  if (!lng) return DEFAULT_RECOGNITION_LOCALE;

  // If already a locale-ish tag, keep it
  if (lng.includes("-")) return lng;

  const base = baseLanguage(lng);
  if (base in LOCALE_MAP) return LOCALE_MAP[base as LanguageCode];

  return DEFAULT_RECOGNITION_LOCALE;
}

export function getDocumentLangFallback(): string {
  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement.lang?.trim();
    if (htmlLang) return htmlLang;
  }
  if (typeof navigator !== "undefined") {
    const navLang = navigator.language?.trim();
    if (navLang) return navLang;
  }
  return "en";
}