/**
 * @fileoverview CSS HSL parser unit tests
 * @module lib/__tests__/cssHsl.test
 */

import { describe, it, expect } from 'vitest'
import { parseCssHsl, hslToHex } from '../three/cssHsl'

describe('parseCssHsl', () => {
  describe('valid inputs', () => {
    it('parses standard HSL triplet', () => {
      const result = parseCssHsl('280 85% 65%')

      expect(result).not.toBeNull()
      expect(result?.h).toBeCloseTo(280 / 360, 5)
      expect(result?.s).toBeCloseTo(0.85, 5)
      expect(result?.l).toBeCloseTo(0.65, 5)
    })

    it('handles extra whitespace', () => {
      const result = parseCssHsl('  280   85%   65%  ')

      expect(result).not.toBeNull()
      expect(result?.h).toBeCloseTo(280 / 360, 5)
    })

    it('handles comma-separated format', () => {
      const result = parseCssHsl('280, 85%, 65%')

      expect(result).not.toBeNull()
    })

    it('handles decimal values', () => {
      const result = parseCssHsl('280.5 85.5% 65.5%')

      expect(result).not.toBeNull()
      expect(result?.h).toBeCloseTo(280.5 / 360, 5)
    })

    it('handles edge case: 0 0% 0%', () => {
      const result = parseCssHsl('0 0% 0%')

      expect(result).toEqual({ h: 0, s: 0, l: 0 })
    })

    it('handles edge case: 360 100% 100%', () => {
      const result = parseCssHsl('360 100% 100%')

      expect(result).toEqual({ h: 1, s: 1, l: 1 })
    })
  })

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(parseCssHsl('')).toBeNull()
    })

    it('returns null for null input', () => {
      expect(parseCssHsl(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(parseCssHsl(undefined)).toBeNull()
    })

    it('returns null for non-string input', () => {
      // @ts-expect-error Testing invalid input
      expect(parseCssHsl(123)).toBeNull()
    })

    it('returns null for invalid format', () => {
      expect(parseCssHsl('invalid')).toBeNull()
      expect(parseCssHsl('rgb(255, 0, 0)')).toBeNull()
      expect(parseCssHsl('#ff0000')).toBeNull()
    })

    it('returns null for out-of-range hue', () => {
      expect(parseCssHsl('400 85% 65%')).toBeNull()
      expect(parseCssHsl('-10 85% 65%')).toBeNull()
    })

    it('returns null for out-of-range saturation', () => {
      expect(parseCssHsl('280 120% 65%')).toBeNull()
    })

    it('returns null for out-of-range lightness', () => {
      expect(parseCssHsl('280 85% 150%')).toBeNull()
    })
  })
})

describe('hslToHex', () => {
  it('converts HSL to valid hex format', () => {
    const hex = hslToHex({ h: 280 / 360, s: 0.85, l: 0.65 })

    expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('converts pure red correctly', () => {
    const hex = hslToHex({ h: 0, s: 1, l: 0.5 })

    expect(hex.toLowerCase()).toBe('#ff0000')
  })

  it('converts pure green correctly', () => {
    const hex = hslToHex({ h: 120 / 360, s: 1, l: 0.5 })

    expect(hex.toLowerCase()).toBe('#00ff00')
  })

  it('converts pure blue correctly', () => {
    const hex = hslToHex({ h: 240 / 360, s: 1, l: 0.5 })

    expect(hex.toLowerCase()).toBe('#0000ff')
  })

  it('converts black correctly', () => {
    const hex = hslToHex({ h: 0, s: 0, l: 0 })

    expect(hex.toLowerCase()).toBe('#000000')
  })

  it('converts white correctly', () => {
    const hex = hslToHex({ h: 0, s: 0, l: 1 })

    expect(hex.toLowerCase()).toBe('#ffffff')
  })
})
