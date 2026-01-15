/**
 * @fileoverview Device capability detection for adaptive rendering
 * @module components/3d/aurora/deviceTier
 * @sonarqube cognitive-complexity: 4
 */

/** Device tier classification */
export type DeviceTier = 'low' | 'medium' | 'high'

/** Particle count presets by device tier */
const PARTICLE_COUNTS = Object.freeze({
    low: 50,
    medium: 150,
    high: 300
} as const)

/** Cached device tier to avoid repeated detection */
let cachedTier: DeviceTier | null = null

/**
 * Detects device tier based on available signals.
 * Uses hardware concurrency, device memory, and device type.
 *
 * @returns Device performance tier
 */
export function detectDeviceTier(): DeviceTier {
    if (cachedTier) return cachedTier

    if (typeof navigator === 'undefined') {
        cachedTier = 'medium'
        return cachedTier
    }

    // Collect performance signals
    const cores = navigator.hardwareConcurrency || 4
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    )

    // Mobile devices default to lower tier for battery/thermal
    if (isMobile) {
        // High-end mobile: 8+ cores, 4+ GB RAM
        if (cores >= 8 && memory >= 4) {
            cachedTier = 'medium'
        } else {
            cachedTier = 'low'
        }
        return cachedTier
    }

    // Desktop scoring
    let score = 0

    // CPU cores scoring
    if (cores >= 8) score += 2
    else if (cores >= 4) score += 1

    // Memory scoring
    if (memory >= 8) score += 2
    else if (memory >= 4) score += 1

    // GPU hint from WebGL (if available)
    try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        if (gl) {
            const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
            if (debugInfo) {
                const renderer = (gl as WebGLRenderingContext).getParameter(
                    debugInfo.UNMASKED_RENDERER_WEBGL
                ) as string
                // Known high-performance GPUs
                if (/RTX|GTX|Radeon RX|Apple M[1-9]/i.test(renderer)) {
                    score += 2
                } else if (/Intel|AMD|NVIDIA/i.test(renderer)) {
                    score += 1
                }
            }
        }
    } catch {
        // WebGL detection failed, continue with other signals
    }

    // Classify tier based on score
    if (score >= 5) {
        cachedTier = 'high'
    } else if (score >= 2) {
        cachedTier = 'medium'
    } else {
        cachedTier = 'low'
    }

    return cachedTier
}

/**
 * Gets optimal particle count based on device tier.
 * Can be overridden with explicit count.
 *
 * @param explicitCount - Optional explicit particle count override
 * @returns Recommended particle count for current device
 */
export function getOptimalParticleCount(explicitCount?: number): number {
    if (explicitCount !== undefined && explicitCount > 0) {
        return explicitCount
    }

    const tier = detectDeviceTier()
    return PARTICLE_COUNTS[tier]
}

/**
 * Checks if reduced motion is preferred by user.
 * Respects prefers-reduced-motion media query.
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Resets cached tier (useful for testing)
 */
export function resetDeviceTierCache(): void {
    cachedTier = null
}
