/**
 * WebGL Context Loss Recovery Tests
 * Verifies graceful fallback when WebGL context is lost
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BreakthroughDirector } from '../breakthrough/director';
import type { MutatedVariant, MutationKnobs, DirectorPhase } from '../breakthrough/types';

// Mock mutation knobs for testing
const mockMutation: MutationKnobs = {
  durationRange: [3000, 8000],
  particleCountRange: [500, 2000],
  cameraArchetype: 'drift',
  curveProfile: 'ease',
  paletteSeed: 0.5,
  audioIntensity: 0.7,
  audioTimingOffset: 0,
  speedMultiplier: 1.0,
  scaleMultiplier: 1.0,
  extraVisualsCount: 0,
};

// Mock variant for testing with required properties
const mockVariant: MutatedVariant = {
  id: 'test-variant',
  name: 'Test Variant',
  description: 'Test variant for WebGL recovery',
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
    speedRange: [0.5, 2.0],
    scaleRange: [0.5, 2.0],
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
  seed: 12345,
  finalDuration: 5000,
  finalParticleCount: 1000,
  finalColors: ['#60a5fa'],
};

describe('WebGL Context Loss Recovery', () => {
  let director: BreakthroughDirector;
  let onCompleteMock: () => void;
  let onAbortMock: (reason: string) => void;
  let onPhaseChangeMock: (phase: DirectorPhase) => void;

  beforeEach(() => {
    onCompleteMock = vi.fn() as unknown as () => void;
    onAbortMock = vi.fn() as unknown as (reason: string) => void;
    onPhaseChangeMock = vi.fn() as unknown as (phase: DirectorPhase) => void;

    // Create director with no-arg constructor
    director = new BreakthroughDirector();

    // Set callbacks using the proper API
    director.setCallbacks({
      onComplete: onCompleteMock,
      onAbort: onAbortMock,
      onPhaseChange: onPhaseChangeMock,
    });
  });

  it('handles WebGL context loss during playing phase by aborting', () => {
    // Start playing
    director.play(mockVariant);
    expect(director.getState().phase).toBe('playing');

    // Simulate WebGL context loss
    director.handleWebGLContextLost();

    // Should abort (not complete) with reason - state is cleaned up after
    expect(onAbortMock).toHaveBeenCalledWith('webgl_context_lost');
    // Phase should be idle after cleanup
    expect(director.getState().phase).toBe('idle');
  });

  it('does not call complete callback on context loss (uses abort instead)', () => {
    // Start playing
    director.play(mockVariant);

    // Simulate WebGL context loss
    director.handleWebGLContextLost();

    // Should have called abort (not complete) - WebGL failure is not a successful completion
    expect(onAbortMock).toHaveBeenCalledWith('webgl_context_lost');
    // Complete should NOT be called since this is an error condition
    expect(onCompleteMock).not.toHaveBeenCalled();
  });

  it('returns to idle state after context loss (no hang)', () => {
    // Start playing
    director.play(mockVariant);
    expect(director.getState().phase).toBe('playing');

    // Simulate WebGL context loss
    director.handleWebGLContextLost();

    // Key verification: state is cleaned up and ready for next use (no hang)
    const state = director.getState();
    expect(state.phase).toBe('idle');
    expect(state.error).toBeNull(); // Cleaned up
    expect(state.currentVariant).toBeNull(); // Cleaned up
  });

  it('ignores context loss during idle phase', () => {
    expect(director.getState().phase).toBe('idle');

    // Context loss when not playing should not cause issues
    director.handleWebGLContextLost();

    // Should still be idle, no error callbacks
    expect(director.getState().phase).toBe('idle');
    expect(onAbortMock).not.toHaveBeenCalled();
  });

  it('tracks context loss error in analytics', () => {
    director.play(mockVariant);

    // Spy on trackEvent
    const trackSpy = vi.spyOn(director as unknown as { trackEvent: (e: string) => void }, 'trackEvent');

    director.handleWebGLContextLost();

    // Should have tracked error event
    expect(trackSpy).toHaveBeenCalledWith('error');
  });
});
