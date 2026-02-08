import { describe, it, expect } from "vitest";
import { getSpeechLocale } from '../speechLocale';
import { languages } from '../config';

describe('getSpeechLocale', () => {
  it('returns a valid locale string for each supported language code', () => {
    languages.forEach(({ code }) => {
      const locale = getSpeechLocale(code);
      expect(locale).toMatch(/^[a-z]{2,3}-[A-Z]{2,3}(-[a-zA-Z0-9]+)?$/);
      expect(typeof locale).toBe('string');
      expect(locale.length).toBeGreaterThan(0);
    });
  });

  it('returns default locale for null/undefined input', () => {
    expect(getSpeechLocale(null)).toBe('en-US');
    expect(getSpeechLocale(undefined)).toBe('en-US');
  });

  it('returns input if already a locale-like string', () => {
    expect(getSpeechLocale('en-GB')).toBe('en-GB');
    expect(getSpeechLocale('fr-CA')).toBe('fr-CA');
  });

  it('maps base language codes to default locales', () => {
    expect(getSpeechLocale('en')).toBe('en-US');
    expect(getSpeechLocale('es')).toBe('es-ES');
    expect(getSpeechLocale('fr')).toBe('fr-FR');
    expect(getSpeechLocale('de')).toBe('de-DE');
    expect(getSpeechLocale('ja')).toBe('ja-JP');
  });

  it('falls back to en-US for unknown languages', () => {
    expect(getSpeechLocale('unknown')).toBe('en-US');
    expect(getSpeechLocale('xyz')).toBe('en-US');
  });
});
