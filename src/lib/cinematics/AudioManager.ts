/**
 * Audio Manager for ASPIRAL Cinematics
 * Handles audio loading, playback, and synchronization
 */

import type { AudioConfig } from './types';

/**
 * Audio manager class for cinematic audio playback
 */
export class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private config: AudioConfig;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private isLoaded = false;
  private loadError: Error | null = null;

  constructor(config: AudioConfig) {
    this.config = config;
  }

  /**
   * Preload audio file
   * Returns promise that resolves when audio is loaded
   */
  async preload(): Promise<void> {
    if (this.isLoaded || this.loadError) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.audio = new Audio(this.config.src);
        this.audio.volume = this.config.volume || 0.7;
        this.audio.loop = this.config.loop || false;

        this.audio.addEventListener('canplaythrough', () => {
          this.isLoaded = true;
          resolve();
        }, { once: true });

        this.audio.addEventListener('error', (e) => {
          const error = new Error(`Failed to load audio: ${this.config.src}`);
          this.loadError = error;
          console.warn('[AudioManager] Audio file not found, continuing silently:', this.config.src);
          // Resolve instead of reject - graceful degradation
          resolve();
        }, { once: true });

        // Start loading
        this.audio.load();
      } catch (error) {
        console.warn('[AudioManager] Audio initialization failed:', error);
        // Resolve instead of reject - graceful degradation
        resolve();
      }
    });
  }

  /**
   * Play audio with optional fade-in
   */
  async play(): Promise<void> {
    if (!this.audio || this.loadError) {
      return;
    }

    try {
      // Apply start time offset if specified
      if (this.config.startTime) {
        this.audio.currentTime = this.config.startTime / 1000;
      }

      // Start at low volume if fade-in is enabled
      if (this.config.fadeIn) {
        this.audio.volume = 0;
      }

      // Play audio
      await this.audio.play();

      // Fade in if configured
      if (this.config.fadeIn) {
        this.fadeIn(this.config.fadeIn);
      }
    } catch (error) {
      console.warn('[AudioManager] Failed to play audio:', error);
    }
  }

  /**
   * Pause audio
   */
  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  /**
   * Stop audio with optional fade-out
   */
  stop(immediate = false): void {
    if (!this.audio) return;

    this.clearFadeInterval();

    if (immediate || !this.config.fadeOut) {
      this.audio.pause();
      this.audio.currentTime = 0;
    } else {
      this.fadeOut(this.config.fadeOut);
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current playback time (seconds)
   */
  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  /**
   * Get audio duration (seconds)
   */
  getDuration(): number {
    return this.audio?.duration || 0;
  }

  /**
   * Check if audio is playing
   */
  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }

  /**
   * Fade in audio
   */
  private fadeIn(duration: number): void {
    if (!this.audio) return;

    this.clearFadeInterval();

    const targetVolume = this.config.volume || 0.7;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    this.fadeInterval = setInterval(() => {
      if (!this.audio) {
        this.clearFadeInterval();
        return;
      }

      currentStep++;
      this.audio.volume = Math.min(volumeStep * currentStep, targetVolume);

      if (currentStep >= steps) {
        this.clearFadeInterval();
      }
    }, stepDuration);
  }

  /**
   * Fade out audio
   */
  private fadeOut(duration: number): void {
    if (!this.audio) return;

    this.clearFadeInterval();

    const initialVolume = this.audio.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = initialVolume / steps;
    let currentStep = 0;

    this.fadeInterval = setInterval(() => {
      if (!this.audio) {
        this.clearFadeInterval();
        return;
      }

      currentStep++;
      this.audio.volume = Math.max(initialVolume - volumeStep * currentStep, 0);

      if (currentStep >= steps) {
        this.clearFadeInterval();
        this.audio.pause();
        this.audio.currentTime = 0;
      }
    }, stepDuration);
  }

  /**
   * Clear fade interval
   */
  private clearFadeInterval(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  /**
   * Dispose audio manager and free resources
   */
  dispose(): void {
    this.clearFadeInterval();

    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    this.isLoaded = false;
    this.loadError = null;
  }
}

/**
 * Create audio manager from config
 */
export function createAudioManager(config: AudioConfig): AudioManager {
  return new AudioManager(config);
}

/**
 * Preload multiple audio files
 */
export async function preloadAudioFiles(configs: AudioConfig[]): Promise<AudioManager[]> {
  const managers = configs.map((config) => new AudioManager(config));

  await Promise.all(managers.map((manager) => manager.preload()));

  return managers;
}
