/**
 * Translation Keys Parity Test
 *
 * Ensures all translation keys are consistent across all supported languages
 * and that all values are non-empty strings.
 */

import { describe, it, expect } from "vitest";

// Import all locale files
import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import de from "../locales/de.json";
import ja from "../locales/ja.json";

const locales = {
  en,
  es,
  fr,
  de,
  ja,
};

const supportedLanguages = ["en", "es", "fr", "de", "ja"] as const;

type SupportedLanguage = (typeof supportedLanguages)[number];

/**
 * Recursively flatten object keys into dot-notation paths
 */
function flattenKeys(obj: any, prefix = ""): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys.sort();
}

/**
 * Validate that a value is a non-empty string
 */
function validateTranslationValue(value: any, key: string, language: string): void {
  if (value === null || value === undefined) {
    throw new Error(`Null/undefined value for key "${key}" in ${language}`);
  }

  if (typeof value !== "string") {
    throw new Error(`Non-string value for key "${key}" in ${language}: ${typeof value}`);
  }

  if (value.trim() === "") {
    throw new Error(`Empty string value for key "${key}" in ${language}`);
  }
}

/**
 * Recursively validate all leaf values in a translation object
 */
function validateAllValues(obj: any, prefix = "", language: string): void {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      validateAllValues(value, fullKey, language);
    } else {
      validateTranslationValue(value, fullKey, language);
    }
  }
}

describe("Translation Keys Parity", () => {
  it("should have all supported locale files loaded", () => {
    supportedLanguages.forEach((lang) => {
      expect(locales[lang]).toBeDefined();
      expect(typeof locales[lang]).toBe("object");
      expect(locales[lang]).not.toBeNull();
    });
  });

  it("should have consistent translation keys across all languages", () => {
    const englishKeys = flattenKeys(en);
    const totalEnglishKeys = englishKeys.length;

    expect(totalEnglishKeys).toBeGreaterThan(0);

    supportedLanguages.forEach((lang) => {
      if (lang === "en") return; // Skip English as it's the reference

      const localeKeys = flattenKeys(locales[lang]);
      const missingKeys = englishKeys.filter((key) => !localeKeys.includes(key));
      const extraKeys = localeKeys.filter((key) => !englishKeys.includes(key));

      // Provide detailed error messages for debugging
      if (missingKeys.length > 0) {
        console.error(`Missing keys in ${lang}:`, missingKeys.slice(0, 10));
        if (missingKeys.length > 10) {
          console.error(`... and ${missingKeys.length - 10} more`);
        }
      }

      if (extraKeys.length > 0) {
        console.error(`Extra keys in ${lang}:`, extraKeys.slice(0, 10));
        if (extraKeys.length > 10) {
          console.error(`... and ${extraKeys.length - 10} more`);
        }
      }

      expect(missingKeys, `Missing keys in ${lang}`).toEqual([]);
      expect(extraKeys, `Extra keys in ${lang}`).toEqual([]);
      expect(localeKeys.length, `Key count mismatch in ${lang}`).toBe(totalEnglishKeys);
    });
  });

  it("should have only non-empty string values in all locales", () => {
    supportedLanguages.forEach((lang) => {
      validateAllValues(locales[lang], "", lang);
    });
  });

  it("should have a reasonable number of translation keys", () => {
    const englishKeys = flattenKeys(en);
    expect(englishKeys.length).toBeGreaterThan(10); // At least some translations
    expect(englishKeys.length).toBeLessThan(10000); // Not unreasonably large
  });

  it("should not have duplicate keys within each locale", () => {
    supportedLanguages.forEach((lang) => {
      const keys = flattenKeys(locales[lang]);
      const uniqueKeys = new Set(keys);
      expect(keys.length, `Duplicate keys found in ${lang}`).toBe(uniqueKeys.size);
    });
  });
});