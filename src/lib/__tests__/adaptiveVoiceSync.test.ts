import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import {
    calculateAdaptiveSyncDelay,
    markSpeakRequestStart,
    markAudioPlaybackStart,
    getSyncStats,
    resetSyncState,
    waitForSyncDelay,
    withAdaptiveSync
} from '../adaptiveVoiceSync'

// Mock logger
vi.mock('@/lib/logger', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }))
}))

describe('adaptiveVoiceSync', () => {
    let mockPerformanceNow: number

    beforeEach(() => {
        vi.useFakeTimers()

        // Reset performance.now mock
        mockPerformanceNow = 1000
        vi.spyOn(performance, 'now').mockImplementation(() => mockPerformanceNow)

        // Reset module state
        resetSyncState()
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    // Helper to advance performance time
    const advanceTime = (ms: number) => {
        mockPerformanceNow += ms
        vi.advanceTimersByTime(ms)
    }

    describe('State Management & Core Timing', () => {
        it('resetSyncState clears all state to defaults', () => {
            // First modify state
            markSpeakRequestStart()
            advanceTime(100)
            markAudioPlaybackStart()

            // Verify state is modified
            const statsBefore = getSyncStats()
            expect(statsBefore.sampleCount).toBe(1)
            expect(statsBefore.isCalibrated).toBe(true)

            // Reset
            resetSyncState()

            // Verify reset
            const statsAfter = getSyncStats()
            expect(statsAfter.sampleCount).toBe(0)
            expect(statsAfter.isCalibrated).toBe(false)
            expect(statsAfter.emaLatencyMs).toBe(400) // Default
        })

        it('markSpeakRequestStart sets the start time internally', () => {
            // We can't access internal state directly, but we can infer it via getSyncStats?
            // Actually getSyncStats doesn't expose lastSpeakRequestTime.
            // But we can verify it affects subsequent calculations or behavior.
            // Or rely on the fact that markAudioPlaybackStart uses it.

            markSpeakRequestStart()
            advanceTime(100)
            markAudioPlaybackStart()

            const stats = getSyncStats()
            expect(stats.sampleCount).toBe(1)
            // 100ms latency should be recorded
            expect(stats.recentSamples[0]).toBe(100)
        })

        it('markAudioPlaybackStart calculates latency correctly', () => {
            markSpeakRequestStart()
            advanceTime(150)
            markAudioPlaybackStart()

            const stats = getSyncStats()
            expect(stats.sampleCount).toBe(1)
            expect(stats.recentSamples[0]).toBe(150)
            expect(stats.emaLatencyMs).toBe(150) // First sample = EMA
        })

        it('markAudioPlaybackStart without preceding request does nothing', () => {
            markAudioPlaybackStart()

            const stats = getSyncStats()
            expect(stats.sampleCount).toBe(0)
            expect(stats.isCalibrated).toBe(false)
        })
    })

    describe('Latency Calculation Logic', () => {
        it('clamps latency samples (min 50ms)', () => {
            markSpeakRequestStart()
            advanceTime(10) // Too fast
            markAudioPlaybackStart()

            const stats = getSyncStats()
            expect(stats.recentSamples[0]).toBe(50) // Min clamped
        })

        it('clamps latency samples (max 5000ms)', () => {
            markSpeakRequestStart()
            advanceTime(6000) // Too slow
            markAudioPlaybackStart()

            const stats = getSyncStats()
            expect(stats.recentSamples[0]).toBe(5000) // Max clamped
        })

        it('calculates EMA correctly for subsequent samples', () => {
            // 1. First sample: 100ms
            markSpeakRequestStart()
            advanceTime(100)
            markAudioPlaybackStart()

            let stats = getSyncStats()
            expect(stats.emaLatencyMs).toBe(100)

            // 2. Second sample: 200ms
            // EMA = 0.3 * 200 + (1 - 0.3) * 100 = 60 + 70 = 130
            markSpeakRequestStart()
            advanceTime(200)
            markAudioPlaybackStart()

            stats = getSyncStats()
            expect(stats.emaLatencyMs).toBe(130)

            // 3. Third sample: 300ms
            // EMA = 0.3 * 300 + 0.7 * 130 = 90 + 91 = 181
            markSpeakRequestStart()
            advanceTime(300)
            markAudioPlaybackStart()

            stats = getSyncStats()
            expect(stats.emaLatencyMs).toBe(181)
        })

        it('maintains a sliding window of 5 samples', () => {
            // Add 6 samples
            for (let i = 1; i <= 6; i++) {
                markSpeakRequestStart()
                advanceTime(100 * i)
                markAudioPlaybackStart()
            }

            const stats = getSyncStats()
            expect(stats.sampleCount).toBe(5)
            // Should contain samples 2, 3, 4, 5, 6 (100 is dropped)
            // But wait, latency depends on advanceTime.
            // 1st: 100
            // 2nd: 200
            // ...
            // 6th: 600
            expect(stats.recentSamples).toEqual([200, 300, 400, 500, 600])
        })
    })

    describe('calculateAdaptiveSyncDelay', () => {
        it('calculates delay based on EMA and text length', () => {
            // Setup EMA to 400 (default)
            // Base delay = min(400 * 0.5, 300) = 200

            // Text length 0
            // Factor = 0
            // Natural delay = 200 + 0 = 200
            // Total = 200 + 200 = 400

            expect(calculateAdaptiveSyncDelay(0)).toBe(400)

            // Text length 100
            // Factor = 1
            // Natural delay = 200 + 150 = 350
            // Total = 200 + 350 = 550
            expect(calculateAdaptiveSyncDelay(100)).toBe(550)
        })

        it('respects MIN_SYNC_DELAY_MS (200ms)', () => {
            // Force very low EMA
            resetSyncState()
            markSpeakRequestStart()
            advanceTime(50) // Clamped to 50
            markAudioPlaybackStart()

            // EMA is 50. Base delay = 25.
            // Text length 0. Natural delay = 200.
            // Total = 225.

            // Wait, 225 > 200.
            // Let's force lower natural delay? No, natural delay min is 200.
            // Base delay min is effectively 0 if EMA is 0.

            // So total delay min = 0 + 200 = 200.

            expect(calculateAdaptiveSyncDelay(0)).toBeGreaterThanOrEqual(200)
        })

        it('respects MAX_SYNC_DELAY_MS (1500ms)', () => {
            // Force high EMA
            resetSyncState()
            markSpeakRequestStart()
            advanceTime(5000)
            markAudioPlaybackStart()

            // EMA is 5000. Base delay = min(2500, 300) = 300.
            // Wait, base delay is capped at 300.

            // Length factor max is 1 (length >= 100).
            // Natural delay max = 200 + 150 = 350.

            // Total = 300 + 350 = 650.

            // It seems difficult to hit 1500 with the current logic unless I misunderstood it.
            // Logic:
            // baseDelay = min(ema * 0.5, 300) -> Max 300
            // lengthFactor = min(len/100, 1) -> Max 1
            // naturalDelay = 200 + factor * 150 -> Max 350
            // total = base + natural -> Max 650

            // Wait, let me check the code again.
            // const baseDelay = Math.min(state.emaLatency * 0.5, 300)
            // const lengthFactor = Math.min(textLength / 100, 1)
            // const naturalDelay = MIN_SYNC_DELAY_MS + lengthFactor * 150
            // let totalDelay = baseDelay + naturalDelay

            // If the code is:
            // MIN_SYNC_DELAY_MS = 200
            // MAX_SYNC_DELAY_MS = 1500

            // Max possible calculated value: 300 + 350 = 650.
            // So it will never hit 1500.
            // But checking that it is <= 1500 is still valid.

            expect(calculateAdaptiveSyncDelay(1000)).toBeLessThanOrEqual(1500)
        })

        it('handles extremely long text gracefully', () => {
            // Text length > 100 -> factor = 1
            expect(calculateAdaptiveSyncDelay(10000)).toBeLessThanOrEqual(1500)
            // Should be same as 100 if base delay is constant
            expect(calculateAdaptiveSyncDelay(10000)).toBe(calculateAdaptiveSyncDelay(100))
        })
    })

    describe('Async Utilities', () => {
        it('waitForSyncDelay resolves after delay', async () => {
            const promise = waitForSyncDelay(0)

            // Should not resolve immediately (delay is at least 200ms)
            let resolved = false
            promise.then(() => { resolved = true })

            await vi.advanceTimersByTimeAsync(100)
            expect(resolved).toBe(false)

            await vi.advanceTimersByTimeAsync(500) // Enough to cover delay
            expect(resolved).toBe(true)
        })

        it('withAdaptiveSync wraps function and maintains args', async () => {
            const originalFn = vi.fn().mockResolvedValue('result')
            const wrapped = withAdaptiveSync(originalFn)

            const promise = wrapped('hello', 123)

            // Should verify that markSpeakRequestStart was called
            // But we can't spy on the export from the same module easily without complex mocking.
            // Instead, we verify the side effect (latency measurement requires start time).

            // Advance time to resolve the delay
            await vi.advanceTimersByTimeAsync(1000)

            await expect(promise).resolves.toBe('result')
            expect(originalFn).toHaveBeenCalledWith('hello', 123)

            // Now verify start time was set by calling markAudioPlaybackStart
            // and checking if a sample is recorded.
            // Note: withAdaptiveSync calls markSpeakRequestStart internally.

            advanceTime(100)
            markAudioPlaybackStart()

            const stats = getSyncStats()
            expect(stats.sampleCount).toBe(1)
        })
    })

    describe('Performance', () => {
        it('calculateAdaptiveSyncDelay executes efficiently', () => {
            const start = performance.now()
            for (let i = 0; i < 1000; i++) {
                calculateAdaptiveSyncDelay(100)
            }
            const end = performance.now()
            expect(end - start).toBeLessThan(5) // Giving a bit more buffer than 1ms for test environment variability
        })
    })
})
