/**
 * @fileoverview Procedural texture generation for Aurora platform
 * @module components/3d/aurora/textures
 */

import * as THREE from 'three'

/** Texture cache for singleton pattern */
let glowTextureCache: THREE.Texture | null = null

/**
 * Creates radial gradient glow texture.
 * Uses canvas for GPU-efficient procedural generation.
 *
 * @param size - Texture resolution (power of 2 recommended)
 * @returns THREE.Texture with radial alpha gradient
 */
export function createGlowTexture(size = 256): THREE.Texture {
  if (glowTextureCache !== null) {
    return glowTextureCache
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Fallback: return empty texture
    return new THREE.Texture()
  }

  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2

  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, radius
  )

  // Apple-style soft falloff
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)')
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  glowTextureCache = texture
  return texture
}

/**
 * Disposes cached textures for cleanup.
 */
export function disposeTextures(): void {
  glowTextureCache?.dispose()
  glowTextureCache = null
}
