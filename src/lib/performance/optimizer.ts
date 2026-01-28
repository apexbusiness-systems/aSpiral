/**
 * Performance Optimizer for ASPIRAL Cinematics
 * Handles adaptive quality, FPS monitoring, and memory management
 */

import type { QualitySettings, DeviceCapabilities, PerformanceMetrics } from '../cinematics/types';
import { getDeviceType, getMemoryUsage } from '../analytics';

/**
 * FPS monitor class with O(1) circular buffer
 * Eliminates array.shift() overhead for better performance
 */
export class FPSMonitor {
  private readonly capacity = 60;
  private frames: Float32Array;
  private head = 0;
  private count = 0;
  private lastTime = performance.now();
  private frameCount = 0;

  constructor() {
    this.frames = new Float32Array(this.capacity);
  }

  /**
   * Update FPS (call every frame) - O(1) operation
   */
  update(): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    const fps = 1000 / delta;

    // Circular buffer insertion - O(1), no array shifting
    this.frames[this.head] = fps;
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);

    this.frameCount++;
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    if (this.count === 0) return 0;
    const lastIndex = (this.head - 1 + this.capacity) % this.capacity;
    return this.frames[lastIndex];
  }

  /**
   * Get average FPS
   */
  getAverageFPS(): number {
    if (this.count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.count; i++) {
      sum += this.frames[i];
    }
    return sum / this.count;
  }

  /**
   * Get minimum FPS
   */
  getMinFPS(): number {
    if (this.count === 0) return 0;
    let min = Infinity;
    for (let i = 0; i < this.count; i++) {
      if (this.frames[i] < min) {
        min = this.frames[i];
      }
    }
    return min;
  }

  /**
   * Get maximum FPS
   */
  getMaxFPS(): number {
    if (this.count === 0) return 0;
    let max = -Infinity;
    for (let i = 0; i < this.count; i++) {
      if (this.frames[i] > max) {
        max = this.frames[i];
      }
    }
    return max;
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
    this.frames.fill(0);
    this.head = 0;
    this.count = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
  }
}

/**
 * Detect device capabilities with GPU fingerprinting
 * Uses WEBGL_debug_renderer_info for accurate GPU identification
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;

  let gpuTier = 2; // Default to medium
  let maxTextureSize = 2048;
  let webglVersion = 1;
  let gpuVendor = 'unknown';
  let gpuRenderer = 'unknown';

  if (gl) {
    // Get max texture size
    maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

    // Check WebGL version
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      webglVersion = 2;
    }

    // Get GPU info via debug extension for accurate tier detection
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      gpuVendor = (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string) || 'unknown';
      gpuRenderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string) || 'unknown';
    }

    // Enhanced GPU tier detection based on renderer string
    const rendererLower = gpuRenderer.toLowerCase();

    // High-end: Discrete GPUs and Apple Silicon
    if (
      rendererLower.includes('nvidia') ||
      rendererLower.includes('radeon') ||
      rendererLower.includes('geforce') ||
      rendererLower.includes('rtx') ||
      rendererLower.includes('gtx') ||
      rendererLower.includes('rx 5') ||
      rendererLower.includes('rx 6') ||
      rendererLower.includes('rx 7') ||
      (rendererLower.includes('apple') && rendererLower.includes('m1')) ||
      (rendererLower.includes('apple') && rendererLower.includes('m2')) ||
      (rendererLower.includes('apple') && rendererLower.includes('m3')) ||
      (rendererLower.includes('apple') && rendererLower.includes('m4'))
    ) {
      gpuTier = 3;
    }
    // Low-end: Intel integrated, low-tier Mali, old Adreno
    else if (
      rendererLower.includes('intel') ||
      rendererLower.includes('mali-4') ||
      rendererLower.includes('mali-t') ||
      rendererLower.includes('adreno 3') ||
      rendererLower.includes('adreno 4') ||
      rendererLower.includes('adreno 5') ||
      rendererLower.includes('powervr') ||
      rendererLower.includes('videocore')
    ) {
      gpuTier = 1;
    }
    // Mid-range: Everything else (modern integrated, mid-tier mobile)
    else {
      gpuTier = 2;
    }

    // Fallback: Use texture size if renderer detection failed
    if (gpuRenderer === 'unknown') {
      if (maxTextureSize >= 16384 && webglVersion === 2) {
        gpuTier = 3;
      } else if (maxTextureSize >= 8192) {
        gpuTier = 2;
      } else {
        gpuTier = 1;
      }
    }

    // Bonus for very high texture support
    if (maxTextureSize >= 16384 && webglVersion === 2 && gpuTier < 3) {
      gpuTier = Math.min(gpuTier + 1, 3);
    }
  }

  return {
    deviceType: getDeviceType(),
    gpuTier,
    maxTextureSize,
    webglVersion,
    availableMemory: getMemoryUsage(),
    gpuVendor,
    gpuRenderer,
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
 * Detect low power mode synchronously (basic check)
 * For full battery check, use isLowPowerModeAsync
 */
export function isLowPowerMode(): boolean {
  // Check for reduced motion as a proxy for power saving
  if (prefersReducedMotion()) {
    return true;
  }
  return false;
}

/**
 * Detect low power mode asynchronously with Battery API
 * Returns true if battery < 20% and not charging, or if reduced motion is preferred
 */
export async function isLowPowerModeAsync(): Promise<boolean> {
  // Check for reduced motion preference
  if (prefersReducedMotion()) {
    return true;
  }

  try {
    // @ts-expect-error - Battery API not fully typed
    if (navigator.getBattery) {
      // @ts-expect-error -- Performance API types mismatch in some environments
      const battery = await navigator.getBattery();

      // Low power if battery < 20% and not charging
      if (battery.level < 0.2 && !battery.charging) {
        return true;
      }

      // Also consider very low battery (< 10%) regardless of charging
      if (battery.level < 0.1) {
        return true;
      }
    }
  } catch {
    // Battery API not available or failed
  }

  return false;
}

/**
 * Get quality settings with power-aware adjustments
 */
export async function getQualitySettingsAsync(
  capabilities: DeviceCapabilities
): Promise<QualitySettings> {
  const baseSettings = getQualitySettings(capabilities);

  const lowPower = await isLowPowerModeAsync();
  if (lowPower) {
    return {
      ...baseSettings,
      particleMultiplier: Math.min(baseSettings.particleMultiplier, 0.5),
      enablePostProcessing: false,
      renderScale: Math.min(baseSettings.renderScale, 0.75),
    };
  }

  return baseSettings;
}

/**
 * Detect device quality tier for breakthrough system
 */
export function detectDeviceTier(): 'low' | 'mid' | 'high' {
  const capabilities = detectDeviceCapabilities();

  if (capabilities.gpuTier >= 3 && capabilities.deviceType === 'desktop') {
    return 'high';
  }

  if (capabilities.gpuTier >= 2) {
    return 'mid';
  }

  return 'low';
}
