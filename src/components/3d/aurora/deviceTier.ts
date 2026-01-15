/**
 * @fileoverview Device capability detection for adaptive rendering
 * @module components/3d/aurora/deviceTier
 * @sonarqube cognitive-complexity: 10
 */

/** Device tier classification */
export type DeviceTier = 'low' | 'medium' | 'high'

/** Particle count presets by device tier */
const PARTICLE_COUNTS = Object.freeze({
    low: 50,
    medium: 150,
    high: 300
} as const)

/** Mobile device detection pattern */
const MOBILE_PATTERN = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i

/** High-performance GPU pattern */
const HIGH_PERF_GPU = /RTX|GTX|Radeon RX|Apple M[1-9]/i

/** Known GPU vendors pattern */
const KNOWN_GPU_VENDORS = /Intel|AMD|NVIDIA/i

/** Cached device tier to avoid repeated detection */
let cachedTier: DeviceTier | null = null

/** Calculate score from hardware specs */
function calculateHardwareScore(cores: number, memory: number): number {
    let score = 0
    if (cores >= 8) score += 2
    else if (cores >= 4) score += 1
    if (memory >= 8) score += 2
    else if (memory >= 4) score += 1
    return score
}

/** Get GPU score from WebGL renderer string */
function getGpuScore(): number {
    try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        if (!gl) return 0

        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
        if (!debugInfo) return 0

        const renderer = (gl as WebGLRenderingContext).getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL
        ) as string

        if (HIGH_PERF_GPU.test(renderer)) return 2
        if (KNOWN_GPU_VENDORS.test(renderer)) return 1
        return 0
    } catch {
        return 0
    }
}

/** Convert score to tier */
function scoreToTier(score: number): DeviceTier {
    if (score >= 5) return 'high'
    if (score >= 2) return 'medium'
    return 'low'
}

/**
 * Detects device tier based on available signals.
 * Uses hardware concurrency, device memory, and device type.
 */
export function detectDeviceTier(): DeviceTier {
    if (cachedTier) return cachedTier

    if (typeof navigator === 'undefined') {
        cachedTier = 'medium'
        return cachedTier
    }

    const cores = navigator.hardwareConcurrency || 4
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4
    const isMobile = MOBILE_PATTERN.test(navigator.userAgent)

    if (isMobile) {
        cachedTier = (cores >= 8 && memory >= 4) ? 'medium' : 'low'
        return cachedTier
    }

    const score = calculateHardwareScore(cores, memory) + getGpuScore()
    cachedTier = scoreToTier(score)
    return cachedTier
}

/**
 * Gets optimal particle count based on device tier.
 * @param explicitCount - Optional explicit particle count override
 */
export function getOptimalParticleCount(explicitCount?: number): number {
    if (explicitCount !== undefined && explicitCount > 0) {
        return explicitCount
    }
    return PARTICLE_COUNTS[detectDeviceTier()]
}

/**
 * Checks if reduced motion is preferred by user.
 */
export function prefersReducedMotion(): boolean {
    if (typeof globalThis.window === 'undefined') return false
    return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Resets cached tier (useful for testing)
 */
export function resetDeviceTierCache(): void {
    cachedTier = null
}
