/**
 * Performance Optimizer for ASPIRAL Cinematics
 * Handles adaptive quality, FPS monitoring, and memory management
 */

import type { QualitySettings, DeviceCapabilities, PerformanceMetrics } from '../cinematics/types';
import { getDeviceType, getMemoryUsage } from '../analytics';

/**
 * FPS monitor class
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();
  private frameCount = 0;

  /**
   * Update FPS (call every frame)
   */
  update(): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    const fps = 1000 / delta;
    this.frames.push(fps);

    // Keep only last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }

    this.frameCount++;
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    if (this.frames.length === 0) return 0;
    return this.frames[this.frames.length - 1];
  }

  /**
   * Get average FPS
   */
  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return sum / this.frames.length;
  }

  /**
   * Get minimum FPS
   */
  getMinFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.min(...this.frames);
  }

  /**
   * Get maximum FPS
   */
  getMaxFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.max(...this.frames);
  }

  /**
   * Get total frame count
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Reset monitor
   */
  reset(): void {
    this.frames = [];
    this.lastTime = performance.now();
    this.frameCount = 0;
  }
}

/**
 * Detect device capabilities
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  let gpuTier = 2; // Default to medium
  let maxTextureSize = 2048;
  let webglVersion = 1;

  if (gl) {
    // Get max texture size
    maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    // Check WebGL version
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      webglVersion = 2;
    }

    // Estimate GPU tier based on max texture size and WebGL version
    if (maxTextureSize >= 16384 && webglVersion === 2) {
      gpuTier = 3; // High-end
    } else if (maxTextureSize >= 8192) {
      gpuTier = 2; // Mid-range
    } else {
      gpuTier = 1; // Low-end
    }
  }

  return {
    deviceType: getDeviceType(),
    gpuTier,
    maxTextureSize,
    webglVersion,
    availableMemory: getMemoryUsage(),
  };
}

/**
 * Get quality settings based on device capabilities
 */
export function getQualitySettings(capabilities: DeviceCapabilities): QualitySettings {
  const { deviceType, gpuTier } = capabilities;

  // Desktop high-end
  if (deviceType === 'desktop' && gpuTier === 3) {
    return {
      particleMultiplier: 1.0,
      enablePostProcessing: true,
      enableShadows: true,
      renderScale: 1.0,
      antialias: true,
    };
  }

  // Desktop mid-range
  if (deviceType === 'desktop' && gpuTier === 2) {
    return {
      particleMultiplier: 0.8,
      enablePostProcessing: true,
      enableShadows: false,
      renderScale: 1.0,
      antialias: true,
    };
  }

  // Desktop low-end
  if (deviceType === 'desktop' && gpuTier === 1) {
    return {
      particleMultiplier: 0.5,
      enablePostProcessing: false,
      enableShadows: false,
      renderScale: 0.8,
      antialias: false,
    };
  }

  // Tablet
  if (deviceType === 'tablet') {
    return {
      particleMultiplier: 0.6,
      enablePostProcessing: true,
      enableShadows: false,
      renderScale: 0.9,
      antialias: true,
    };
  }

  // Mobile
  return {
    particleMultiplier: 0.4,
    enablePostProcessing: false,
    enableShadows: false,
    renderScale: 0.75,
    antialias: false,
  };
}

/**
 * Adaptive quality manager
 */
export class AdaptiveQuality {
  private fpsMonitor = new FPSMonitor();
  private qualitySettings: QualitySettings;
  private capabilities: DeviceCapabilities;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private onQualityChange?: (settings: QualitySettings) => void;

  constructor(onQualityChange?: (settings: QualitySettings) => void) {
    this.capabilities = detectDeviceCapabilities();
    this.qualitySettings = getQualitySettings(this.capabilities);
    this.onQualityChange = onQualityChange;
  }

  /**
   * Start adaptive quality monitoring
   */
  start(): void {
    if (this.checkInterval) return;

    // Check performance every 2 seconds
    this.checkInterval = setInterval(() => {
      this.checkPerformance();
    }, 2000);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Update FPS (call every frame)
   */
  update(): void {
    this.fpsMonitor.update();
  }

  /**
   * Check performance and adjust quality if needed
   */
  private checkPerformance(): void {
    const avgFps = this.fpsMonitor.getAverageFPS();

    // If FPS drops below 30, reduce quality
    if (avgFps < 30 && avgFps > 0) {
      console.warn('[AdaptiveQuality] Low FPS detected, reducing quality');
      this.reduceQuality();
    }

    // If FPS is consistently above 55, consider increasing quality
    if (avgFps > 55 && this.qualitySettings.particleMultiplier < 1.0) {
      console.log('[AdaptiveQuality] High FPS detected, increasing quality');
      this.increaseQuality();
    }
  }

  /**
   * Reduce quality settings
   */
  private reduceQuality(): void {
    const settings = { ...this.qualitySettings };
    let changed = false;

    // Step 1: Reduce particles
    if (settings.particleMultiplier > 0.25) {
      settings.particleMultiplier = Math.max(0.25, settings.particleMultiplier - 0.2);
      changed = true;
    }

    // Step 2: Disable post-processing
    if (settings.enablePostProcessing) {
      settings.enablePostProcessing = false;
      changed = true;
    }

    // Step 3: Reduce render scale
    if (settings.renderScale > 0.5) {
      settings.renderScale = Math.max(0.5, settings.renderScale - 0.1);
      changed = true;
    }

    if (changed) {
      this.qualitySettings = settings;
      this.onQualityChange?.(settings);
    }
  }

  /**
   * Increase quality settings (conservative)
   */
  private increaseQuality(): void {
    const settings = { ...this.qualitySettings };
    let changed = false;

    // Only increase particles slightly
    if (settings.particleMultiplier < 1.0) {
      settings.particleMultiplier = Math.min(1.0, settings.particleMultiplier + 0.1);
      changed = true;
    }

    if (changed) {
      this.qualitySettings = settings;
      this.onQualityChange?.(settings);
    }
  }

  /**
   * Get current quality settings
   */
  getQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      avgFps: this.fpsMonitor.getAverageFPS(),
      minFps: this.fpsMonitor.getMinFPS(),
      maxFps: this.fpsMonitor.getMaxFPS(),
      peakMemoryMB: getMemoryUsage(),
      frameCount: this.fpsMonitor.getFrameCount(),
      droppedFrames: this.estimateDroppedFrames(),
    };
  }

  /**
   * Estimate dropped frames
   */
  private estimateDroppedFrames(): number {
    const targetFps = 60;
    const avgFps = this.fpsMonitor.getAverageFPS();
    const frameCount = this.fpsMonitor.getFrameCount();

    if (avgFps === 0 || frameCount === 0) return 0;

    const expectedFrames = (frameCount / avgFps) * targetFps;
    return Math.max(0, Math.floor(expectedFrames - frameCount));
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.fpsMonitor.reset();
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.stop();
    this.reset();
  }
}

/**
 * Calculate optimal particle count based on device
 */
export function calculateParticleCount(
  baseCount: number,
  settings: QualitySettings
): number {
  return Math.floor(baseCount * settings.particleMultiplier);
}

/**
 * Check if device supports reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Detect low power mode (Safari)
 */
export function isLowPowerMode(): boolean {
  // @ts-expect-error - battery API not fully typed
  if (navigator.getBattery) {
    // Battery API available - could check battery level
    // For now, just return false
    return false;
  }
  return false;
}
