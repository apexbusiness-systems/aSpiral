/**
 * @fileoverview CSS HSL parser for THREE.js color bridging
 * @module lib/three/cssHsl
 * @sonarqube cognitive-complexity: 4
 */

/** Normalized HSL fractions for THREE.Color compatibility */
export interface HslFractions {
  /** Hue: 0-1 (mapped from 0-360°) */
  readonly h: number
  /** Saturation: 0-1 (mapped from 0-100%) */
  readonly s: number
  /** Lightness: 0-1 (mapped from 0-100%) */
  readonly l: number
}

/** CSS HSL pattern: "280 85% 65%" or "280, 85%, 65%" */
const HSL_PATTERN = /^(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%?\s*,?\s*(\d+(?:\.\d+)?)%?$/

/**
 * Parses CSS HSL triplet string into THREE-compatible fractions.
 *
 * @param raw - CSS HSL string (e.g., "280 85% 65%")
 * @returns Normalized fractions or null if invalid
 *
 * @example
 * parseCssHsl("280 85% 65%") // { h: 0.778, s: 0.85, l: 0.65 }
 * parseCssHsl("invalid") // null
 */
export function parseCssHsl(raw: string | null | undefined): HslFractions | null {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null
  }

  const match = raw.trim().match(HSL_PATTERN)
  if (!match) {
    return null
  }

  const h = parseFloat(match[1])
  const s = parseFloat(match[2])
  const l = parseFloat(match[3])

  const isValidRange = (
    h >= 0 && h <= 360 &&
    s >= 0 && s <= 100 &&
    l >= 0 && l <= 100
  )

  if (!isValidRange) {
    return null
  }

  return Object.freeze({
    h: h / 360,
    s: s / 100,
    l: l / 100
  })
}

/**
 * Converts HSL fractions to hex color string.
 * Uses optimized HSL-to-RGB algorithm.
 *
 * @param hsl - Normalized HSL fractions
 * @returns Hex color string (e.g., "#8b5cf6")
 */
export function hslToHex(hsl: HslFractions): string {
  const { h, s, l } = hsl

  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const hueSegment = h * 6
  const x = chroma * (1 - Math.abs(hueSegment % 2 - 1))
  const match = l - chroma / 2

  let r = 0
  let g = 0
  let b = 0

  if (hueSegment < 1) { r = chroma; g = x }
  else if (hueSegment < 2) { r = x; g = chroma }
  else if (hueSegment < 3) { g = chroma; b = x }
  else if (hueSegment < 4) { g = x; b = chroma }
  else if (hueSegment < 5) { r = x; b = chroma }
  else { r = chroma; b = x }

  const toHex = (n: number): string =>
    Math.round((n + match) * 255).toString(16).padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
