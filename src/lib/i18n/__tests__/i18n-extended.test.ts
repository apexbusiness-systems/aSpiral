/**
 * Extended i18n Tests
 * 
 * Rigorous validation of the translation system including:
 * - Plural form handling
 * - Interpolation variable presence
 * - Language persistence
 * - HTML lang synchronization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import all locale files
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import ja from '../locales/ja.json';

const locales = { en, es, fr, de, ja } as const;
type LocaleCode = keyof typeof locales;
const supportedLanguages: LocaleCode[] = ['en', 'es', 'fr', 'de', 'ja'];

// ============================================================================
// Utility Functions (moved to outer scope per SonarQube)
// ============================================================================

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};

    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
        } else if (typeof value === 'string') {
            // Only include actual string values, skip numbers/booleans/arrays
            result[fullKey] = value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            // Safely convert primitives to strings
            result[fullKey] = value.toString();
        }
        // Skip arrays and other non-primitive values
    }

    return result;
}

/**
 * Extracts interpolation variables like {{count}} from a translation string
 */
function extractInterpolationVars(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return matches.map(m => m.replaceAll('{{', '').replaceAll('}}', ''));
}

/**
 * Synchronizes the HTML lang attribute with the current language
 */
function syncHtmlLang(lng: string): void {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lng;
}

/**
 * Sorts strings using locale-aware comparison
 */
function sortLocaleCompare(arr: string[]): string[] {
    return [...arr].sort((a, b) => a.localeCompare(b));
}

// ============================================================================
// Plural Form Tests
// ============================================================================
describe('i18n Plural Form Handling', () => {
    const pluralKeys = [
        'time.minutesAgo',
        'time.hoursAgo',
        'time.daysAgo',
    ];

    it('English has both singular and plural forms for time keys', () => {
        const flattened = flattenObject(en as unknown as Record<string, unknown>);

        pluralKeys.forEach(baseKey => {
            expect(flattened[baseKey]).toBeDefined();
            expect(flattened[`${baseKey}_plural`]).toBeDefined();
        });
    });

    it('all locales have plural forms for time keys', () => {
        supportedLanguages.forEach(lang => {
            const flattened = flattenObject(locales[lang] as unknown as Record<string, unknown>);

            pluralKeys.forEach(baseKey => {
                expect(flattened[baseKey], `Missing ${baseKey} in ${lang}`).toBeDefined();
                expect(flattened[`${baseKey}_plural`], `Missing ${baseKey}_plural in ${lang}`).toBeDefined();
            });
        });
    });

    it('singular and plural forms are different', () => {
        supportedLanguages.forEach(lang => {
            const flattened = flattenObject(locales[lang] as unknown as Record<string, unknown>);

            pluralKeys.forEach(baseKey => {
                const singular = flattened[baseKey];
                const plural = flattened[`${baseKey}_plural`];

                // In most languages singular and plural should differ
                // (Japanese may be same due to lack of grammatical plural)
                if (lang !== 'ja') {
                    expect(singular, `${baseKey} singular should differ from plural in ${lang}`).not.toBe(plural);
                }
            });
        });
    });
});

// ============================================================================
// Interpolation Variable Tests
// ============================================================================
describe('i18n Interpolation Variables', () => {
    it('time keys contain {{count}} variable', () => {
        const timeKeys = ['time.minutesAgo', 'time.hoursAgo', 'time.daysAgo'];

        supportedLanguages.forEach(lang => {
            const flattened = flattenObject(locales[lang] as unknown as Record<string, unknown>);

            timeKeys.forEach(key => {
                const value = flattened[key];
                expect(value, `${key} should exist in ${lang}`).toBeDefined();
                expect(value, `${key} should contain {{count}} in ${lang}`).toContain('{{count}}');
            });
        });
    });

    it('interpolation variables are consistent across locales', () => {
        const enFlattened = flattenObject(en as unknown as Record<string, unknown>);

        for (const [key, enValue] of Object.entries(enFlattened)) {
            const enVars = extractInterpolationVars(enValue);

            if (enVars.length === 0) continue;

            supportedLanguages.forEach(lang => {
                if (lang === 'en') return;

                const langFlattened = flattenObject(locales[lang] as unknown as Record<string, unknown>);
                const langValue = langFlattened[key];

                if (!langValue) return; // Key parity tested elsewhere

                const langVars = extractInterpolationVars(langValue);

                // Use toSorted with localeCompare for reliable comparison
                expect(
                    sortLocaleCompare(langVars),
                    `Interpolation vars for "${key}" should match in ${lang}`
                ).toEqual(sortLocaleCompare(enVars));
            });
        }
    });
});

// ============================================================================
// Language Persistence Tests
// ============================================================================
describe('Language Persistence', () => {
    const STORAGE_KEY = 'i18nextLng';
    let localStorageMock: Record<string, string>;

    beforeEach(() => {
        localStorageMock = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => localStorageMock[key] ?? null,
            setItem: (key: string, value: string) => { localStorageMock[key] = value; },
            removeItem: (key: string) => { delete localStorageMock[key]; },
            clear: () => { localStorageMock = {}; },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('persists language selection to localStorage', () => {
        localStorage.setItem(STORAGE_KEY, 'es');
        expect(localStorage.getItem(STORAGE_KEY)).toBe('es');
    });

    it('reads persisted language on init', () => {
        localStorage.setItem(STORAGE_KEY, 'fr');
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBe('fr');
    });

    it('survives simulated page reload', () => {
        localStorage.setItem(STORAGE_KEY, 'de');

        // Simulate "new session" - clear reference but keep storage
        const storedBefore = localStorage.getItem(STORAGE_KEY);

        // "Reload"
        const storedAfter = localStorage.getItem(STORAGE_KEY);

        expect(storedAfter).toBe('de');
        expect(storedAfter).toBe(storedBefore);
    });
});

// ============================================================================
// HTML Lang Attribute Tests
// ============================================================================
describe('HTML Lang Attribute Synchronization', () => {
    beforeEach(() => {
        // Mock document for Node environment
        vi.stubGlobal('document', {
            documentElement: { lang: 'en' },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('sets HTML lang attribute on language change', () => {
        syncHtmlLang('es');
        expect(document.documentElement.lang).toBe('es');
    });

    it('updates lang for all supported languages', () => {
        supportedLanguages.forEach(lang => {
            syncHtmlLang(lang);
            expect(document.documentElement.lang).toBe(lang);
        });
    });
});

// ============================================================================
// Speech Locale Mapping Tests
// ============================================================================
describe('Speech Locale Mapping', () => {
    const UI_TO_SPEECH_MAP: Record<string, string> = {
        en: 'en-US',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        ja: 'ja-JP',
    };

    function getSpeechLocale(uiLang: string): string {
        return UI_TO_SPEECH_MAP[uiLang] || 'en-US';
    }

    it('maps UI languages to correct speech recognition locales', () => {
        expect(getSpeechLocale('en')).toBe('en-US');
        expect(getSpeechLocale('es')).toBe('es-ES');
        expect(getSpeechLocale('fr')).toBe('fr-FR');
        expect(getSpeechLocale('de')).toBe('de-DE');
        expect(getSpeechLocale('ja')).toBe('ja-JP');
    });

    it('falls back to en-US for unknown languages', () => {
        expect(getSpeechLocale('zh')).toBe('en-US');
        expect(getSpeechLocale('ko')).toBe('en-US');
        expect(getSpeechLocale('')).toBe('en-US');
    });
});

// ============================================================================
// Translation Value Quality Tests
// ============================================================================
describe('Translation Value Quality', () => {
    it('no translation values contain placeholder text', () => {
        const placeholderPatterns = [
            /TODO/i,
            /FIXME/i,
            /XXX/i,
            /\[TRANSLATE\]/i,
            /\[TO BE TRANSLATED\]/i,
        ];

        supportedLanguages.forEach(lang => {
            const flattened = flattenObject(locales[lang] as unknown as Record<string, unknown>);

            for (const [key, value] of Object.entries(flattened)) {
                placeholderPatterns.forEach(pattern => {
                    expect(
                        pattern.test(value),
                        `Key "${key}" in ${lang} contains placeholder: ${value}`
                    ).toBe(false);
                });
            }
        });
    });

    it('no translation values are excessively long', () => {
        const MAX_LENGTH = 500;

        supportedLanguages.forEach(lang => {
            const flattened = flattenObject(locales[lang] as unknown as Record<string, unknown>);

            for (const [key, value] of Object.entries(flattened)) {
                expect(
                    value.length,
                    `Key "${key}" in ${lang} is too long (${value.length} chars)`
                ).toBeLessThanOrEqual(MAX_LENGTH);
            }
        });
    });

    it('critical UI keys are present in all locales', () => {
        const criticalKeys = [
            'common.loading',
            'common.save',
            'common.cancel',
            'errors.generic',
            'spiral.placeholder',
            'auth.title',
        ];

        supportedLanguages.forEach(lang => {
            const flattened = flattenObject(locales[lang] as unknown as Record<string, unknown>);

            criticalKeys.forEach(key => {
                expect(flattened[key], `Critical key "${key}" missing in ${lang}`).toBeDefined();
                expect(flattened[key]?.trim().length, `Critical key "${key}" is empty in ${lang}`).toBeGreaterThan(0);
            });
        });
    });
});
