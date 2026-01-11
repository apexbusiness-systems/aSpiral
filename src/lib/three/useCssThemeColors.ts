/**
 * @fileoverview React hook for CSS-to-THREE color synchronization
 * @module lib/three/useCssThemeColors
 * @sonarqube cognitive-complexity: 8
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { parseCssHsl, hslToHex } from './cssHsl'

/** Theme color palette synchronized with CSS custom properties */
export interface ThemeColors {
  readonly primary: THREE.Color
  readonly spiralGlow: THREE.Color
  readonly spiralAccent: THREE.Color
  readonly secondary: THREE.Color
  readonly bgStart: THREE.Color
  readonly bgMid: THREE.Color
  readonly bgEnd: THREE.Color
}

/** Hook return type with version for change detection */
export interface ThemeColorsResult {
  readonly colors: ThemeColors
  readonly version: number
}

/** Brand-safe fallback palette (Apple-inspired purple) */
const FALLBACKS = Object.freeze({
  primary: '#8b5cf6',      // Vibrant purple
  spiralGlow: '#a78bfa',   // Soft violet
  spiralAccent: '#7c3aed', // Deep purple
  secondary: '#6366f1',    // Indigo
  bgStart: '#0f0a1e',      // Deep space
  bgMid: '#1a1333',        // Nebula core
  bgEnd: '#2d1f4e'         // Cosmic dust
} as const)

/** CSS custom property names */
const CSS_VARS = Object.freeze({
  primary: '--primary',
  spiralGlow: '--spiral-glow',
  spiralAccent: '--spiral-accent',
  secondary: '--secondary',
  bgStart: '--spiral-bg-start',
  bgMid: '--spiral-bg-mid',
  bgEnd: '--spiral-bg-end'
} as const)

/**
 * Safely reads CSS custom property from document root.
 * Returns null if SSR or property undefined.
 */
function getCssVar(name: string): string | null {
  if (typeof document === 'undefined') return null

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()

  return value.length > 0 ? value : null
}

/**
 * Resolves CSS variable to THREE.Color with fallback.
 * Never throws - always returns valid color.
 */
function resolveColor(cssVar: string, fallback: string): THREE.Color {
  const raw = getCssVar(cssVar)
  const hsl = parseCssHsl(raw)
  const hex = hsl !== null ? hslToHex(hsl) : fallback
  return new THREE.Color(hex)
}

/**
 * Creates initial color palette from CSS or fallbacks.
 */
function createColorPalette(): ThemeColors {
  return {
    primary: resolveColor(CSS_VARS.primary, FALLBACKS.primary),
    spiralGlow: resolveColor(CSS_VARS.spiralGlow, FALLBACKS.spiralGlow),
    spiralAccent: resolveColor(CSS_VARS.spiralAccent, FALLBACKS.spiralAccent),
    secondary: resolveColor(CSS_VARS.secondary, FALLBACKS.secondary),
    bgStart: resolveColor(CSS_VARS.bgStart, FALLBACKS.bgStart),
    bgMid: resolveColor(CSS_VARS.bgMid, FALLBACKS.bgMid),
    bgEnd: resolveColor(CSS_VARS.bgEnd, FALLBACKS.bgEnd)
  }
}

/**
 * Hook that synchronizes CSS custom properties with THREE.Color objects.
 * Automatically updates when theme changes (class/style mutations or system preference).
 *
 * @returns Theme colors and version number for change detection
 *
 * @example
 * const { colors, version } = useCssThemeColors()
 * // colors.primary is a THREE.Color synced with --primary CSS var
 */
export function useCssThemeColors(): ThemeColorsResult {
  const colorsRef = useRef(createColorPalette())
  const [version, setVersion] = useState(0)

  const updateColors = useCallback(() => {
    const current = colorsRef.current

    // Update in-place to preserve object references
    current.primary.copy(resolveColor(CSS_VARS.primary, FALLBACKS.primary))
    current.spiralGlow.copy(resolveColor(CSS_VARS.spiralGlow, FALLBACKS.spiralGlow))
    current.spiralAccent.copy(resolveColor(CSS_VARS.spiralAccent, FALLBACKS.spiralAccent))
    current.secondary.copy(resolveColor(CSS_VARS.secondary, FALLBACKS.secondary))
    current.bgStart.copy(resolveColor(CSS_VARS.bgStart, FALLBACKS.bgStart))
    current.bgMid.copy(resolveColor(CSS_VARS.bgMid, FALLBACKS.bgMid))
    current.bgEnd.copy(resolveColor(CSS_VARS.bgEnd, FALLBACKS.bgEnd))

    setVersion(v => v + 1)
  }, [])

  useEffect(() => {
    // Initial update
    updateColors()

    // Watch for theme class/style changes
    const observer = new MutationObserver((mutations) => {
      const shouldUpdate = mutations.some(
        m => m.attributeName === 'class' || m.attributeName === 'style'
      )
      if (shouldUpdate) {
        updateColors()
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    })

    // Watch for system theme preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateColors)

    // Cleanup (idempotent)
    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', updateColors)
    }
  }, [updateColors])

  return { colors: colorsRef.current, version }
}
