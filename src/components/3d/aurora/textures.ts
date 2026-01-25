/**
 * @fileoverview Aurora platform texture generation utilities
 * @module components/3d/aurora/textures
 * @sonarqube cognitive-complexity: 3
 */

import * as THREE from 'three'

/** Texture cache for reuse across instances */
const textureCache: Map<string, THREE.Texture> = new Map()

/** Gradient stop configuration */
interface GradientStop {
    position: number
    alpha: number
}

/** Preset gradient configurations */
const GRADIENT_PRESETS = {
    glow: [
        { position: 0, alpha: 1 },
        { position: 0.4, alpha: 0.8 },
        { position: 0.7, alpha: 0.3 },
        { position: 1, alpha: 0 }
    ],
    sparkle: [
        { position: 0, alpha: 1 },
        { position: 0.2, alpha: 0.9 },
        { position: 0.5, alpha: 0.4 },
        { position: 1, alpha: 0 }
    ]
} as const

/**
 * Creates a radial gradient texture with configurable stops.
 * Shared implementation for all gradient-based textures.
 */
function createRadialGradientTexture(
    cacheKey: string,
    size: number,
    stops: readonly GradientStop[]
): THREE.Texture {
    const cached = textureCache.get(cacheKey)
    if (cached) return cached

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        const fallback = new THREE.Texture()
        fallback.needsUpdate = true
        return fallback
    }

    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    )

    for (const stop of stops) {
        gradient.addColorStop(stop.position, `rgba(255, 255, 255, ${stop.alpha})`)
    }

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    texture.colorSpace = THREE.SRGBColorSpace

    textureCache.set(cacheKey, texture)
    return texture
}

/**
 * Creates a radial glow alpha texture for the aurora haze effect.
 * @param size - Texture resolution (default 256)
 */
export function createGlowTexture(size = 256): THREE.Texture {
    return createRadialGradientTexture(`glow_${size}`, size, GRADIENT_PRESETS.glow)
}

/**
 * Creates a sparkle/noise texture for particle effects.
 * @param size - Texture resolution (default 64)
 */
export function createSparkleTexture(size = 64): THREE.Texture {
    return createRadialGradientTexture(`sparkle_${size}`, size, GRADIENT_PRESETS.sparkle)
}

/**
 * Disposes all cached textures.
 * Call this when component unmounts to free GPU memory.
 */
export function disposeTextures(): void {
    textureCache.forEach(texture => {
        texture.dispose()
    })
    textureCache.clear()
}

/**
 * Gets the number of textures currently cached.
 * Useful for debugging memory usage.
 */
export function getTextureCacheSize(): number {
    return textureCache.size
}
