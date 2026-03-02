import { describe, expect, it } from 'vitest';
import { resolveVoiceProfile } from '../voiceProfile';

describe('resolveVoiceProfile', () => {
  it('maps natural profile to nova with normalized volume', () => {
    const profile = resolveVoiceProfile({
      voiceType: 'natural',
      speechRate: 1,
      voiceVolume: 80,
    });

    expect(profile).toEqual({
      voice: 'nova',
      speed: 1,
      volume: 0.8,
    });
  });

  it('clamps extreme speech settings safely', () => {
    const profile = resolveVoiceProfile({
      voiceType: 'energetic',
      speechRate: 2,
      voiceVolume: 120,
    });

    expect(profile.voice).toBe('shimmer');
    expect(profile.speed).toBe(1.5);
    expect(profile.volume).toBe(0.8);
  });

  it('falls back to secure defaults on invalid payload', () => {
    const profile = resolveVoiceProfile({
      voiceType: 'invalid',
      speechRate: 'fast',
      voiceVolume: -10,
    });

    expect(profile).toEqual({
      voice: 'nova',
      speed: 1,
      volume: 0.8,
    });
  });
});
