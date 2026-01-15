/**
 * @fileoverview Aurora platform texture generation utilities
 * @module components/3d/aurora/textures
 * @sonarqube cognitive-complexity: 3
 */

import * as THREE from 'three'

/** Texture cache for reuse across instances */
const textureCache: Map<string, THREE.Texture> = new Map()

/**
 * Creates a radial glow alpha texture for the aurora haze effect.
 * Uses canvas 2D for generation, then converts to THREE.Texture.
 *
 * @param size - Texture resolution (default 256)
 * @returns THREE.Texture with radial gradient alpha
 */
export function createGlowTexture(size = 256): THREE.Texture {
    const cacheKey = `glow_${size}`
    const cached = textureCache.get(cacheKey)
    if (cached) return cached

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        // Fallback: return a simple white texture
        const fallback = new THREE.Texture()
        fallback.needsUpdate = true
        return fallback
    }

    // Create radial gradient: white center fading to transparent edges
    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,           // Inner circle center
        size / 2, size / 2, size / 2     // Outer circle radius
    )
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    texture.colorSpace = THREE.SRGBColorSpace

    textureCache.set(cacheKey, texture)
    return texture
}

/**
 * Creates a sparkle/noise texture for particle effects.
 *
 * @param size - Texture resolution (default 64)
 * @returns THREE.Texture with soft circular sparkle
 */
export function createSparkleTexture(size = 64): THREE.Texture {
    const cacheKey = `sparkle_${size}`
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

    // Create soft circular gradient for sparkle
    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    )
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    texture.colorSpace = THREE.SRGBColorSpace

    textureCache.set(cacheKey, texture)
    return texture
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
