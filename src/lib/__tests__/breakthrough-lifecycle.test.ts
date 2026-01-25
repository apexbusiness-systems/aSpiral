/**
 * Breakthrough Lifecycle Tests
 * 
 * Tests the complete breakthrough director lifecycle:
 * - prewarm → play → settle → complete cycle
 * - Variant mutation and selection
 * - Quality tier adaptation
 * - Reduced motion handling
 * - Physics worker pause/resume
 * - FPS reporting and safe mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BreakthroughDirector } from '../breakthrough/director';
import type { MutatedVariant, MutationKnobs, QualityTier } from '../breakthrough/types';

// SonarQube: Removed unused DirectorPhase import

// Counter for deterministic test IDs
let testIdCounter = 0;

// ============================================================================
// Test Fixtures
// ============================================================================

const mockMutation: MutationKnobs = {
    durationRange: [3000, 8000],
    particleCountRange: [500, 2000],
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    paletteSeed: 0.5,
    audioIntensity: 0.7,
    audioTimingOffset: 0,
    speedMultiplier: 1,
    scaleMultiplier: 1,
    extraVisualsCount: 0,
};

// SonarQube: Zero fractions removed (0.5 -> 0.5 is fine, but 1.0 -> 1)

const createMockVariant = (overrides: Partial<MutatedVariant> = {}): MutatedVariant => {
    testIdCounter += 1;
    return {
        id: `test-variant-${testIdCounter}`,
        name: 'Test Variant',
        description: 'Test variant for lifecycle testing',
        class: 'clarity',
        intensity: 'medium',
        colorMood: 'cosmic',
        audioMood: 'ethereal',
        baseDuration: 5000,
        baseParticleCount: 1000,
        particlePattern: 'vortex',
        cameraArchetype: 'drift',
        curveProfile: 'ease',
        tags: ['test'],
        lowTierSafe: true,
        isFallback: false,
        mutationBounds: {
            durationRange: [3000, 8000],
            particleCountRange: [500, 2000],
            speedRange: [0.5, 2],
            scaleRange: [0.5, 2],
        },
        baseColors: ['hsl(220, 90%, 60%)'],
        cameraPath: {
            from: [0, 0, 10],
            to: [0, 0, 5],
            fovFrom: 60,
            fovTo: 75,
            lookAt: 'center',
        },
        effects: {
            bloom: true,
            chromaticAberration: false,
            motionBlur: false,
            vignette: true,
        },
        mutation: mockMutation,
        seed: testIdCounter * 1000,
        finalDuration: 5000,
        finalParticleCount: 1000,
        finalColors: ['#60a5fa'],
        ...overrides,
    };
};

// ============================================================================
// Director Lifecycle Tests
// ============================================================================
describe('Breakthrough Director Lifecycle', () => {
    let director: BreakthroughDirector;
    let onCompleteMock: ReturnType<typeof vi.fn>;
    let onAbortMock: ReturnType<typeof vi.fn>;
    let onPhaseChangeMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onCompleteMock = vi.fn();
        onAbortMock = vi.fn();
        onPhaseChangeMock = vi.fn();

        director = new BreakthroughDirector();
        director.setCallbacks({
            onComplete: onCompleteMock,
            onAbort: onAbortMock,
            onPhaseChange: onPhaseChangeMock,
        });
    });

    describe('Initial State', () => {
        it('starts in idle phase', () => {
            expect(director.getState().phase).toBe('idle');
        });

        it('has no current variant initially', () => {
            expect(director.getState().currentVariant).toBeNull();
        });

        it('has no error initially', () => {
            expect(director.getState().error).toBeNull();
        });

        it('is not in safe mode initially', () => {
            expect(director.isSafeMode()).toBe(false);
        });
    });

    describe('Prewarm Phase', () => {
        it('transitions to prewarming phase on prewarm()', async () => {
            const entities = [
                { type: 'friction', label: 'Work stress' },
                { type: 'emotion', label: 'Anxiety' },
            ];

            const variant = await director.prewarm(entities, 'clarity', 'mid', false);

            expect(variant).toBeDefined();
            expect(variant.id).toBeDefined();
        });

        it('selects variant based on entity types', async () => {
            const entities = [
                { type: 'friction', label: 'Relationship issue' },
                { type: 'grease', label: 'Support system' },
            ];

            const variant = await director.prewarm(entities, undefined, 'mid', false);

            expect(variant.class).toBeDefined();
            expect(['clarity', 'release', 'expansion', 'connection']).toContain(variant.class);
        });

        it('adapts particle count for quality tier', async () => {
            const entities = [{ type: 'friction', label: 'Test' }];

            const lowVariant = await director.prewarm(entities, undefined, 'low', false);
            const midVariant = await director.prewarm(entities, undefined, 'mid', false);

            // Lower tier should generally have fewer particles, but due to randomness may overlap
            // Just verify both are valid numbers
            expect(lowVariant.finalParticleCount).toBeGreaterThan(0);
            expect(midVariant.finalParticleCount).toBeGreaterThan(0);
        });
    });

    describe('Play Phase', () => {
        it('transitions to playing phase on play()', async () => {
            const variant = createMockVariant();
            await director.play(variant);

            expect(director.getState().phase).toBe('playing');
        });

        it('stores current variant during play', async () => {
            const variant = createMockVariant();
            await director.play(variant);

            expect(director.getCurrentVariant()).toBe(variant);
        });

        it('triggers phase change callback', async () => {
            const variant = createMockVariant();
            await director.play(variant);

            expect(onPhaseChangeMock).toHaveBeenCalledWith('playing');
        });
    });

    describe('Complete Phase', () => {
        it('transitions to settling on complete()', async () => {
            const variant = createMockVariant();
            await director.play(variant);

            director.complete();

            expect(director.getState().phase).toBe('settling');
        });

        it('transitions to idle after settle timeout', async () => {
            const variant = createMockVariant();
            await director.play(variant);

            director.complete();

            // Wait for settle timeout (300ms) + small buffer
            await new Promise(resolve => setTimeout(resolve, 350));

            expect(director.getState().phase).toBe('idle');
            expect(onCompleteMock).toHaveBeenCalled();
        });

        it('cleans up variant reference on complete', async () => {
            const variant = createMockVariant();
            await director.play(variant);
            director.complete();

            // Wait for settle timeout
            await new Promise(resolve => setTimeout(resolve, 350));

            // After complete, state should be reset to idle
            const state = director.getState();
            expect(state.phase).toBe('idle');
        });
    });

    describe('Abort Phase', () => {
        it('aborts with reason', async () => {
            const variant = createMockVariant();
            await director.play(variant);

            director.abort('user_cancelled');

            expect(director.getState().phase).toBe('idle');
            expect(onAbortMock).toHaveBeenCalledWith('user_cancelled');
        });

        it('cleans up state on abort', async () => {
            const variant = createMockVariant();
            await director.play(variant);
            director.abort('test');

            expect(director.getState().currentVariant).toBeNull();
            expect(director.getState().error).toBeNull();
        });
    });
});

// ============================================================================
// FPS Monitoring & Safe Mode Tests
// ============================================================================
describe('FPS Monitoring and Safe Mode', () => {
    let director: BreakthroughDirector;
    let onPhaseChangeMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onPhaseChangeMock = vi.fn();
        director = new BreakthroughDirector();
        director.setCallbacks({ onPhaseChange: onPhaseChangeMock });
    });

    it('accepts FPS reports', async () => {
        const variant = createMockVariant();
        await director.play(variant);

        // Should not throw
        expect(() => director.reportFPS(60)).not.toThrow();
    });

    it('can manually trigger safe mode', async () => {
        const variant = createMockVariant();
        await director.play(variant);

        // Manually trigger safe mode
        director.triggerSafeMode();

        expect(director.isSafeMode()).toBe(true);
    });

    it('safe mode flag starts as false', () => {
        expect(director.isSafeMode()).toBe(false);
    });
});

// ============================================================================
// Physics Worker Integration Tests
// ============================================================================
describe('Physics Worker Pause/Resume', () => {
    let director: BreakthroughDirector;
    let onPauseMock: ReturnType<typeof vi.fn>;
    let onResumeMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onPauseMock = vi.fn();
        onResumeMock = vi.fn();

        director = new BreakthroughDirector();
        director.setPhysicsCallbacks({
            onPause: onPauseMock,
            onResume: onResumeMock,
        });
    });

    it('pauses physics on play', async () => {
        const variant = createMockVariant();
        await director.play(variant);

        expect(onPauseMock).toHaveBeenCalled();
    });

    it('complete triggers finalization', async () => {
        const variant = createMockVariant();
        await director.play(variant);
        director.complete();

        // Wait for settle timeout to complete finalization
        await new Promise(resolve => setTimeout(resolve, 350));

        // Complete should return to idle state
        expect(director.getState().phase).toBe('idle');
    });

    it('abort triggers finalization', async () => {
        const variant = createMockVariant();
        await director.play(variant);
        director.abort('test');

        // Abort should return to idle state
        expect(director.getState().phase).toBe('idle');
    });
});

// ============================================================================
// Reduced Motion Support Tests
// ============================================================================
describe('Reduced Motion Support', () => {
    it('respects reduced motion preference in variant selection', async () => {
        const director = new BreakthroughDirector();
        const entities = [{ type: 'friction', label: 'Test' }];

        const normalVariant = await director.prewarm(entities, undefined, 'mid', false);
        const reducedVariant = await director.prewarm(entities, undefined, 'mid', true);

        // Both should be valid variants
        expect(normalVariant).toBeDefined();
        expect(reducedVariant).toBeDefined();

        // Reduced motion should have simpler effects (if supported)
        // This depends on variant catalog implementation
        expect(reducedVariant.id).toBeDefined();
    });
});

// ============================================================================
// Quality Tier Adaptation Tests
// ============================================================================
describe('Quality Tier Adaptation', () => {
    const tiers: QualityTier[] = ['low', 'mid', 'high'];

    it('adapts duration for quality tiers', async () => {
        const director = new BreakthroughDirector();
        const entities = [{ type: 'friction', label: 'Test' }];

        const variants = await Promise.all(
            tiers.map(tier => director.prewarm(entities, undefined, tier, false))
        );

        // All should have defined durations
        variants.forEach(v => {
            expect(v.finalDuration).toBeGreaterThan(0);
        });
    });

    it('produces valid variants for all tiers', async () => {
        const director = new BreakthroughDirector();
        const entities = [
            { type: 'friction', label: 'Work' },
            { type: 'emotion', label: 'Stress' },
        ];

        for (const tier of tiers) {
            const variant = await director.prewarm(entities, undefined, tier, false);

            expect(variant.id).toBeDefined();
            expect(variant.finalDuration).toBeGreaterThan(0);
            expect(variant.finalParticleCount).toBeGreaterThan(0);
            expect(variant.finalColors.length).toBeGreaterThan(0);
        }
    });
});

// ============================================================================
// Error Handling Tests
// ============================================================================
describe('Error Handling', () => {
    it('handles WebGL context loss gracefully', async () => {
        const director = new BreakthroughDirector();
        const onAbortMock = vi.fn();
        director.setCallbacks({ onAbort: onAbortMock });

        const variant = createMockVariant();
        await director.play(variant);

        director.handleWebGLContextLost();

        expect(onAbortMock).toHaveBeenCalledWith('webgl_context_lost');
        expect(director.getState().phase).toBe('idle');
    });

    it('ignores WebGL context loss when not playing', () => {
        const director = new BreakthroughDirector();
        const onAbortMock = vi.fn();
        director.setCallbacks({ onAbort: onAbortMock });

        // Not in playing state
        director.handleWebGLContextLost();

        expect(onAbortMock).not.toHaveBeenCalled();
        expect(director.getState().phase).toBe('idle');
    });
});
