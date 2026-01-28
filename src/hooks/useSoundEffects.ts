/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Web Audio API Sound Effects Hook
 * 
 * Generates synthesized sounds for friction, grease, and breakthrough effects
 */

import { useCallback, useRef, useEffect } from "react";

interface SoundEffectsOptions {
  enabled?: boolean;
  volume?: number;
}

export function useSoundEffects(options: SoundEffectsOptions = {}) {
  const { enabled = true, volume = 0.5 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const grindingOscillatorsRef = useRef<OscillatorNode[]>([]);
  const isGrindingRef = useRef(false);

  // Initialize audio context lazily (requires user interaction)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Create master gain node
  const createGain = useCallback((ctx: AudioContext, vol: number) => {
    const gain = ctx.createGain();
    gain.gain.value = vol * volume;
    gain.connect(ctx.destination);
    return gain;
  }, [volume]);

  // Friction grinding sound - metallic, harsh oscillators
  const startGrinding = useCallback((intensity: number = 0.7) => {
    if (!enabled || isGrindingRef.current) return;

    const ctx = getAudioContext();
    isGrindingRef.current = true;

    // Create multiple detuned oscillators for metallic grinding
    const frequencies = [80, 160, 320, 640];
    const oscillators: OscillatorNode[] = [];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Sawtooth for harsh grinding
      osc.type = "sawtooth";
      osc.frequency.value = freq * (1 + intensity * 0.5);

      // Add slight detune for metallic sound
      osc.detune.value = (Math.random() - 0.5) * 50;

      // Bandpass filter for metallic resonance
      filter.type = "bandpass";
      filter.frequency.value = 200 + i * 200;
      filter.Q.value = 5;

      // Volume decreases with higher frequencies
      gain.gain.value = (0.1 / (i + 1)) * volume * intensity;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscillators.push(osc);

      // Modulate frequency for grinding effect
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 4 + Math.random() * 4; // 4-8 Hz wobble
      lfoGain.gain.value = freq * 0.1 * intensity;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      oscillators.push(lfo);
    });

    // Add noise burst for sparks
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.5;
    }

    grindingOscillatorsRef.current = oscillators;
  }, [enabled, volume, getAudioContext]);

  const stopGrinding = useCallback(() => {
    isGrindingRef.current = false;
    grindingOscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Already stopped
      }
    });
    grindingOscillatorsRef.current = [];
  }, []);

  // Grease drip sound - liquid, bubbly
  const playGreaseDrip = useCallback((isCorrect: boolean) => {
    if (!enabled) return;

    const ctx = getAudioContext();
    const gain = createGain(ctx, 0.3);

    // Bubble/drip sound using frequency sweep
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.value = isCorrect ? 400 : 300;

    filter.type = "lowpass";
    filter.frequency.value = 800;
    filter.Q.value = 10;

    osc.connect(filter);
    filter.connect(gain);

    // Frequency sweep for drip effect
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(isCorrect ? 600 : 400, now);
    osc.frequency.exponentialRampToValueAtTime(isCorrect ? 200 : 150, now + 0.2);

    // Volume envelope
    gain.gain.setValueAtTime(0.3 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);

    // Second harmonic for richness
    const osc2 = ctx.createOscillator();
    const gain2 = createGain(ctx, 0.15);
    osc2.type = "sine";
    osc2.frequency.value = isCorrect ? 800 : 600;
    osc2.frequency.exponentialRampToValueAtTime(isCorrect ? 400 : 300, now + 0.2);
    osc2.connect(gain2);
    gain2.gain.setValueAtTime(0.15 * volume, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.start(now);
    osc2.stop(now + 0.25);
  }, [enabled, volume, getAudioContext, createGain]);

  // Grease landing/splatting sound
  const playGreaseLand = useCallback((isCorrect: boolean) => {
    if (!enabled) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create noise for splat
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = isCorrect ? 600 : 400;
    filter.Q.value = 3;

    const gain = createGain(ctx, 0.2);
    gain.gain.setValueAtTime(0.2 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);

    noise.start(now);
    noise.stop(now + 0.15);

    // Add a "stick" or "evaporate" tone
    const osc = ctx.createOscillator();
    const oscGain = createGain(ctx, 0.15);

    if (isCorrect) {
      // Satisfying low thunk for sticking
      osc.type = "sine";
      osc.frequency.value = 150;
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    } else {
      // Rising pitch for evaporation
      osc.type = "sine";
      osc.frequency.value = 200;
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      oscGain.gain.setValueAtTime(0.15 * volume, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    }

    osc.connect(oscGain);
    osc.start(now);
    osc.stop(now + (isCorrect ? 0.1 : 0.3));
  }, [enabled, volume, getAudioContext, createGain]);

  // Breakthrough sound - triumphant chord with shimmer
  const playBreakthrough = useCallback(() => {
    if (!enabled) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Triumphant major chord with overtones
    const chordFrequencies = [
      { freq: 261.63, vol: 1 },    // C4
      { freq: 329.63, vol: 0.8 },  // E4
      { freq: 392.00, vol: 0.9 },  // G4
      { freq: 523.25, vol: 0.7 },  // C5
      { freq: 659.25, vol: 0.5 },  // E5
    ];

    // Master reverb simulation using delays
    const masterGain = createGain(ctx, 0.4);

    chordFrequencies.forEach(({ freq, vol }, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      // Staggered attack for shimmer
      const attackTime = now + i * 0.02;
      oscGain.gain.setValueAtTime(0, attackTime);
      oscGain.gain.linearRampToValueAtTime(vol * volume * 0.3, attackTime + 0.1);
      oscGain.gain.linearRampToValueAtTime(vol * volume * 0.2, attackTime + 0.5);
      oscGain.gain.exponentialRampToValueAtTime(0.01, attackTime + 2);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(attackTime);
      osc.stop(attackTime + 2);

      // Add shimmer oscillator
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = "sine";
      shimmer.frequency.value = freq * 2;
      shimmerGain.gain.setValueAtTime(0, attackTime);
      shimmerGain.gain.linearRampToValueAtTime(vol * volume * 0.1, attackTime + 0.15);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, attackTime + 1.5);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(masterGain);
      shimmer.start(attackTime);
      shimmer.stop(attackTime + 1.5);
    });

    // Add impact transient
    const impact = ctx.createOscillator();
    const impactGain = createGain(ctx, 0.3);
    impact.type = "sine";
    impact.frequency.value = 80;
    impact.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    impactGain.gain.setValueAtTime(0.3 * volume, now);
    impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    impact.connect(impactGain);
    impact.start(now);
    impact.stop(now + 0.3);

    // Whoosh noise
    const whooshBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const whooshData = whooshBuffer.getChannelData(0);
    for (let i = 0; i < whooshData.length; i++) {
      whooshData[i] = (Math.random() * 2 - 1) * (1 - i / whooshData.length);
    }
    const whoosh = ctx.createBufferSource();
    whoosh.buffer = whooshBuffer;
    const whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = "bandpass";
    whooshFilter.frequency.value = 1000;
    whooshFilter.Q.value = 2;
    const whooshGain = createGain(ctx, 0.15);
    whooshGain.gain.setValueAtTime(0.15 * volume, now);
    whooshGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    whoosh.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whoosh.start(now);
    whoosh.stop(now + 0.5);

  }, [enabled, volume, getAudioContext, createGain]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopGrinding();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopGrinding]);

  return {
    startGrinding,
    stopGrinding,
    playGreaseDrip,
    playGreaseLand,
    playBreakthrough,
  };
}
