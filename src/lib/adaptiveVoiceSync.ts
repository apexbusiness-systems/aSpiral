/**
 * @fileoverview Adaptive voice synchronization for TTS latency management
 * @module lib/adaptiveVoiceSync
 * @sonarqube cognitive-complexity: 6
 *
 * Ensures agent TTS playback feels natural by adaptively syncing
 * audio output with user interaction timing.
 */

import { createLogger } from '@/lib/logger'

const logger = createLogger('AdaptiveVoiceSync')

/** Maximum allowed delay in milliseconds */
const MAX_SYNC_DELAY_MS = 1500

/** Minimum delay to prevent jarring instant responses */
const MIN_SYNC_DELAY_MS = 200

/** Number of samples to keep for moving average */
const LATENCY_SAMPLE_SIZE = 5

/** Weight for exponential moving average (higher = more responsive to recent) */
const EMA_WEIGHT = 0.3

/** Latency sample storage */
interface LatencySample {
    timestamp: number
    latencyMs: number
}

/** Sync state for managing adaptive delays */
interface SyncState {
    samples: LatencySample[]
    emaLatency: number
    lastSpeakRequestTime: number | null
    lastAudioStartTime: number | null
    isCalibrated: boolean
}

/** Global sync state */
const state: SyncState = {
    samples: [],
    emaLatency: 400, // Default assumption: 400ms typical latency
    lastSpeakRequestTime: null,
    lastAudioStartTime: null,
    isCalibrated: false
}

/**
 * Records TTS request start time for latency measurement.
 * Call this immediately before initiating a TTS request.
 */
export function markSpeakRequestStart(): void {
    state.lastSpeakRequestTime = performance.now()
}

/**
 * Records when audio actually started playing.
 * Call this from the TTS onStart callback.
 */
export function markAudioPlaybackStart(): void {
    const now = performance.now()
    state.lastAudioStartTime = now

    if (state.lastSpeakRequestTime !== null) {
        const latencyMs = now - state.lastSpeakRequestTime
        recordLatencySample(latencyMs)
        state.lastSpeakRequestTime = null
    }
}

/**
 * Records a latency sample and updates the EMA.
 */
function recordLatencySample(latencyMs: number): void {
    // Clamp to reasonable range
    const clampedLatency = Math.max(50, Math.min(latencyMs, 5000))

    const sample: LatencySample = {
        timestamp: Date.now(),
        latencyMs: clampedLatency
    }

    state.samples.push(sample)

    // Keep only recent samples
    if (state.samples.length > LATENCY_SAMPLE_SIZE) {
        state.samples.shift()
    }

    // Update exponential moving average
    if (!state.isCalibrated) {
        // First sample - use it directly
        state.emaLatency = clampedLatency
        state.isCalibrated = true
    } else {
        state.emaLatency = EMA_WEIGHT * clampedLatency + (1 - EMA_WEIGHT) * state.emaLatency
    }

    logger.debug('Latency sample recorded', {
        sampleMs: clampedLatency,
        emaMs: Math.round(state.emaLatency),
        sampleCount: state.samples.length
    })
}

/**
 * Calculates the optimal delay before starting TTS to sync with user perception.
 *
 * The goal is to make TTS feel responsive but not jarring:
 * - Too fast: Feels artificial, interrupts user's thought process
 * - Too slow: Feels laggy, breaks conversation flow
 *
 * @param textLength - Length of text to be spoken (affects perceived timing)
 * @returns Recommended delay in milliseconds before starting TTS
 */
export function calculateAdaptiveSyncDelay(textLength: number): number {
    // Base delay from measured latency (compensate for network variability)
    const baseDelay = Math.min(state.emaLatency * 0.5, 300)

    // Shorter texts feel more like quick responses - add less delay
    // Longer texts feel more considered - can tolerate slightly more delay
    const lengthFactor = Math.min(textLength / 100, 1) // 0 to 1 scale

    // Natural response timing: 200-500ms feels conversational
    const naturalDelay = MIN_SYNC_DELAY_MS + lengthFactor * 150

    // Combine factors
    let totalDelay = baseDelay + naturalDelay

    // Apply max cap
    totalDelay = Math.min(totalDelay, MAX_SYNC_DELAY_MS)

    // Apply min floor
    totalDelay = Math.max(totalDelay, MIN_SYNC_DELAY_MS)

    logger.debug('Adaptive sync delay calculated', {
        baseDelay: Math.round(baseDelay),
        naturalDelay: Math.round(naturalDelay),
        textLength,
        totalDelay: Math.round(totalDelay)
    })

    return Math.round(totalDelay)
}

/**
 * Gets current sync statistics for debugging.
 */
export function getSyncStats(): {
    emaLatencyMs: number
    sampleCount: number
    isCalibrated: boolean
    recentSamples: number[]
} {
    return {
        emaLatencyMs: Math.round(state.emaLatency),
        sampleCount: state.samples.length,
        isCalibrated: state.isCalibrated,
        recentSamples: state.samples.map(s => Math.round(s.latencyMs))
    }
}

/**
 * Resets sync state (useful for testing or session reset).
 */
export function resetSyncState(): void {
    state.samples = []
    state.emaLatency = 400
    state.lastSpeakRequestTime = null
    state.lastAudioStartTime = null
    state.isCalibrated = false
}

/**
 * Creates a promise that resolves after the adaptive sync delay.
 * Use this before starting TTS to ensure proper timing.
 *
 * @param textLength - Length of text to be spoken
 * @returns Promise that resolves after appropriate delay
 */
export function waitForSyncDelay(textLength: number): Promise<void> {
    const delayMs = calculateAdaptiveSyncDelay(textLength)
    return new Promise(resolve => setTimeout(resolve, delayMs))
}

/**
 * Higher-order function to wrap TTS speak calls with adaptive sync.
 *
 * @param speakFn - The original speak function
 * @returns Wrapped function with adaptive sync
 */
export function withAdaptiveSync<T extends (...args: [string, ...unknown[]]) => Promise<void>>(
    speakFn: T
): T {
    return (async (text: string, ...args: unknown[]) => {
        // Wait for adaptive delay
        await waitForSyncDelay(text.length)

        // Mark request start for latency measurement
        markSpeakRequestStart()

        // Call original speak function
        return speakFn(text, ...args)
    }) as T
}
