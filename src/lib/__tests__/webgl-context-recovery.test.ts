/**
 * WebGL Context Loss Recovery Tests
 * Verifies graceful fallback when WebGL context is lost
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BreakthroughDirector } from '../breakthrough/director';
import type { MutatedVariant, MutationKnobs } from '../breakthrough/types';

// Mock mutation knobs for testing
const mockMutation: MutationKnobs = {
  durationRange: [3000, 8000],
  particleCountRange: [500, 2000],
  cameraArchetype: 'drift',
  curveProfile: 'ease',
  particlePatterns: ['vortex'],
  colorMood: 'cosmic',
  audioMood: 'ethereal',
  intensity: 0.7,
};

// Mock variant for testing with required properties
const mockVariant: MutatedVariant = {
  id: 'test-variant',
  name: 'Test Variant',
  breakthroughClass: 'clarity',
  baseParticleCount: 1000,
  baseDuration: 5000,
  supportedIntensities: ['low', 'medium', 'high'],
  mutation: mockMutation,
  seed: 12345,
  finalDuration: 5000,
  finalParticleCount: 1000,
  finalColors: ['#60a5fa'],
};

describe('WebGL Context Loss Recovery', () => {
  let director: BreakthroughDirector;
  let onCompleteMock: ReturnType<typeof vi.fn>;
  let onAbortMock: ReturnType<typeof vi.fn>;
  let onPhaseChangeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onCompleteMock = vi.fn();
    onAbortMock = vi.fn();
    onPhaseChangeMock = vi.fn();

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
