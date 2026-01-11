# IMPLEMENTATION PLAN: aSpiral Performance & Reliability Enhancement

**Date:** 2025-12-30
**Author:** Co-Founder & Software Architect
**Priority:** High-Impact, Low-Effort Solutions

---

## Overview

This plan outlines step-by-step implementation tasks to address the issues identified in `CODE_REVIEW.md`. Tasks are ordered by priority and grouped into phases for incremental rollout.

---

## Phase 1: Critical Performance Fixes (P1)

### Task 1.1: Eliminate Per-Frame Allocations in ParticleSystem

**File:** `src/lib/cinematics/ParticleSystem.tsx`
**Effort:** 30 minutes
**Impact:** Reduces GC pressure, smoother animations

#### Changes Required:

```typescript
// Add reusable Vector3 at component level (after line 49)
const tempVelocity = useMemo(() => new THREE.Vector3(), []);

// Replace line 172 in useFrame callback:
// OLD: particle.position.add(particle.velocity.clone().multiplyScalar(delta));
// NEW:
tempVelocity.copy(particle.velocity).multiplyScalar(delta);
particle.position.add(tempVelocity);
```

#### Verification:
- Run Chrome DevTools Performance tab
- Verify no "Minor GC" events during cinematic playback

---

### Task 1.2: Proactive Quality Detection with GPU Fingerprinting

**File:** `src/lib/performance/optimizer.ts`
**Effort:** 1 hour
**Impact:** Prevents initial FPS drops by selecting correct quality upfront

#### Changes Required:

Add GPU vendor/renderer detection:

```typescript
// Add after line 116 in detectDeviceCapabilities()
export function detectDeviceCapabilities(): DeviceCapabilities {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;

  let gpuTier = 2;
  let maxTextureSize = 2048;
  let webglVersion = 1;
  let gpuVendor = 'unknown';
  let gpuRenderer = 'unknown';

  if (gl) {
    maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      webglVersion = 2;
    }

    // NEW: Get GPU info via debug extension
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
      gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
    }

    // Enhanced GPU tier detection
    const rendererLower = gpuRenderer.toLowerCase();

    // High-end: Discrete GPUs
    if (
      rendererLower.includes('nvidia') ||
      rendererLower.includes('radeon') ||
      rendererLower.includes('geforce') ||
      (rendererLower.includes('apple') && rendererLower.includes('m1')) ||
      (rendererLower.includes('apple') && rendererLower.includes('m2')) ||
      (rendererLower.includes('apple') && rendererLower.includes('m3'))
    ) {
      gpuTier = 3;
    }
    // Low-end: Intel integrated, Mali, Adreno low-series
    else if (
      rendererLower.includes('intel') ||
      rendererLower.includes('mali-4') ||
      rendererLower.includes('mali-t') ||
      rendererLower.includes('adreno 3') ||
      rendererLower.includes('adreno 4') ||
      rendererLower.includes('adreno 5')
    ) {
      gpuTier = 1;
    }
    // Mid-range: Everything else
    else {
      gpuTier = 2;
    }

    // Override for high texture support
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
```

**Also update types:**
```typescript
// In src/lib/cinematics/types.ts, update DeviceCapabilities
export interface DeviceCapabilities {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  gpuTier: number;
  maxTextureSize: number;
  webglVersion: number;
  availableMemory?: number;
  gpuVendor?: string;
  gpuRenderer?: string;
}
```

---

### Task 1.3: Robust WebGL Context Loss Recovery

**File:** `src/lib/breakthrough/director.ts`
**Effort:** 30 minutes
**Impact:** Prevents blank screens on WebGL crashes

#### Changes Required:

```typescript
// Replace handleWebGLContextLost (lines 121-126)
handleWebGLContextLost(): void {
  logger.warn('WebGL context lost during breakthrough');
  this.trackEvent('error');
  this.state.error = 'webgl_context_lost';

  // Force immediate completion instead of safe mode
  // Safe mode still requires rendering which may fail
  if (this.state.phase === 'playing') {
    this.finalize(false, 'webgl_context_lost');
  }
}
```

**Also update CinematicPlayer for fallback UI:**

```typescript
// In src/components/cinematics/CinematicPlayer.tsx
// Add after hasCompleted state (around line 146)
const [webglFailed, setWebglFailed] = useState(false);

// Update handleWebGLError
const handleWebGLError = useRef(() => {
  console.warn('[CinematicPlayer] WebGL error - showing fallback');
  setWebglFailed(true);

  // Still trigger completion after brief delay
  setTimeout(() => {
    handleComplete();
  }, 500);
}).current;

// Add fallback UI in render (before closing div)
{webglFailed && (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-purple-900/80 to-indigo-900/80">
    <div className="text-center animate-pulse">
      <div className="text-4xl text-white mb-4">Breakthrough Achieved!</div>
      <div className="text-xl text-purple-200">Loading insight...</div>
    </div>
  </div>
)}
```

---

### Task 1.4: Add Cinematic Error Analytics

**File:** `src/lib/analytics.ts`
**Effort:** 20 minutes
**Impact:** Better debugging of production issues

#### Changes Required:

```typescript
// Add new tracking function after trackPerformance (around line 354)
export interface CinematicErrorData {
  variant: CinematicVariant;
  errorType: 'webgl_context_lost' | 'render_error' | 'timeout' | 'unknown';
  errorMessage?: string;
  duration?: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  gpuTier?: number;
  gpuRenderer?: string;
  browserInfo: string;
}

/**
 * Track cinematic errors with device context
 */
export function trackCinematicError(data: CinematicErrorData) {
  if (!isInitialized) initAnalytics();

  try {
    posthog.capture('cinematic_error', {
      ...data,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    });

    console.error('[Analytics] Cinematic error:', data);
  } catch (error) {
    console.error('[Analytics] Failed to track cinematic error:', error);
  }
}

// Export in analytics object
export const analytics = {
  // ... existing exports
  trackCinematicError,
};
```

---

## Phase 2: Analytics & Data Enhancement (P2)

### Task 2.1: Enhanced Performance Metrics with GPU Context

**File:** `src/lib/analytics.ts`
**Effort:** 30 minutes

#### Changes Required:

```typescript
// Update CinematicPerformanceMetrics interface (around line 281)
export interface CinematicPerformanceMetrics {
  variant: CinematicVariant;
  avgFps: number;
  minFps: number;
  maxFps: number;
  peakMemoryMB: number;
  duration: number;
  particleCount: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  // NEW fields
  gpuTier?: number;
  gpuRenderer?: string;
  qualityMultiplier?: number;
  wasAdaptiveReduced?: boolean;
}
```

Update tracking call in CinematicPlayer:

```typescript
// In src/components/cinematics/CinematicPlayer.tsx handleComplete
if (metrics) {
  const capabilities = detectDeviceCapabilities();
  analytics.trackPerformance({
    variant: selectedVariant,
    ...metrics,
    duration,
    particleCount,
    deviceType: analytics.getDeviceType(),
    gpuTier: capabilities.gpuTier,
    gpuRenderer: capabilities.gpuRenderer,
    qualityMultiplier: qualitySettings.particleMultiplier,
    wasAdaptiveReduced: qualitySettings.particleMultiplier < 1.0,
  });
}
```

---

### Task 2.2: Upgrade Three.js to Latest Stable

**File:** `package.json`
**Effort:** 1 hour (including testing)

#### Changes Required:

```bash
npm install three@^0.168.0 @types/three@^0.168.0
```

#### Verification:
- Run all cinematics on desktop and mobile
- Check for deprecation warnings in console
- Verify particle rendering unchanged

---

### Task 2.3: Analytics Opt-Out Toggle in Settings

**Files:** `src/lib/analytics.ts`, Settings component
**Effort:** 45 minutes

#### Changes Required:

```typescript
// Add to analytics.ts
export function setAnalyticsEnabled(enabled: boolean): void {
  if (!isInitialized) return;

  if (enabled) {
    posthog.opt_in_capturing();
    localStorage.setItem('aspiral_analytics_enabled', 'true');
  } else {
    posthog.opt_out_capturing();
    localStorage.setItem('aspiral_analytics_enabled', 'false');
  }
}

export function isAnalyticsEnabled(): boolean {
  return localStorage.getItem('aspiral_analytics_enabled') !== 'false';
}

// Update initAnalytics
export function initAnalytics() {
  if (isInitialized || !POSTHOG_KEY) {
    return;
  }

  // Check user preference
  const userOptedOut = localStorage.getItem('aspiral_analytics_enabled') === 'false';

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
      },
      persistence: 'localStorage',
      opt_out_capturing_by_default: userOptedOut,
    });

    isInitialized = true;
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
}
```

---

## Phase 3: Advanced Optimizations (P2/P3)

### Task 3.1: Circular Buffer for FPS History

**File:** `src/lib/performance/optimizer.ts`
**Effort:** 30 minutes

#### Changes Required:

```typescript
// Replace FPSMonitor class
export class FPSMonitor {
  private frames: Float32Array;
  private head = 0;
  private count = 0;
  private readonly capacity = 60;
  private lastTime = performance.now();
  private frameCount = 0;

  constructor() {
    this.frames = new Float32Array(this.capacity);
  }

  update(): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    const fps = 1000 / delta;

    // Circular buffer insertion (O(1))
    this.frames[this.head] = fps;
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);

    this.frameCount++;
  }

  getCurrentFPS(): number {
    if (this.count === 0) return 0;
    const lastIndex = (this.head - 1 + this.capacity) % this.capacity;
    return this.frames[lastIndex];
  }

  getAverageFPS(): number {
    if (this.count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.count; i++) {
      sum += this.frames[i];
    }
    return sum / this.count;
  }

  getMinFPS(): number {
    if (this.count === 0) return 0;
    let min = Infinity;
    for (let i = 0; i < this.count; i++) {
      min = Math.min(min, this.frames[i]);
    }
    return min;
  }

  getMaxFPS(): number {
    if (this.count === 0) return 0;
    let max = -Infinity;
    for (let i = 0; i < this.count; i++) {
      max = Math.max(max, this.frames[i]);
    }
    return max;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  reset(): void {
    this.frames.fill(0);
    this.head = 0;
    this.count = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
  }
}
```

---

### Task 3.2: Battery/Power Mode Detection

**File:** `src/lib/performance/optimizer.ts`
**Effort:** 20 minutes

#### Changes Required:

```typescript
// Replace isLowPowerMode function
export async function isLowPowerMode(): Promise<boolean> {
  try {
    // @ts-expect-error - Battery API not fully typed
    if (navigator.getBattery) {
      // @ts-expect-error
      const battery = await navigator.getBattery();

      // Consider low power if:
      // 1. Battery level < 20% and not charging
      // 2. Power save mode detected (no direct API, but low battery is indicator)
      if (battery.level < 0.2 && !battery.charging) {
        return true;
      }
    }
  } catch {
    // Battery API not available
  }

  // Check for reduced motion preference as proxy for power saving
  if (prefersReducedMotion()) {
    return true;
  }

  return false;
}

// Update getQualitySettings to use it
export async function getQualitySettingsAsync(
  capabilities: DeviceCapabilities
): Promise<QualitySettings> {
  const baseSettings = getQualitySettings(capabilities);

  const lowPower = await isLowPowerMode();
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
```

---

### Task 3.3: Adaptive Star Count in SpiralScene

**File:** `src/components/3d/SpiralScene.tsx`
**Effort:** 15 minutes

#### Changes Required:

```typescript
// Add at top of SceneContent function
const [starCount, setStarCount] = useState(800);

useEffect(() => {
  const capabilities = detectDeviceCapabilities();
  if (capabilities.deviceType === 'mobile' || capabilities.gpuTier === 1) {
    setStarCount(300);
  } else if (capabilities.deviceType === 'tablet' || capabilities.gpuTier === 2) {
    setStarCount(500);
  }
}, []);

// Update Stars component
<Stars
  radius={80}
  depth={40}
  count={starCount}
  factor={3}
  saturation={0}
  fade
  speed={0.2}
/>
```

---

## Phase 4: Future Enhancements (Experimental)

### Task 4.1: OffscreenCanvas Support (Optional)

**New File:** `src/components/3d/OffscreenRenderer.tsx`
**Effort:** 4-6 hours
**Note:** Requires `@react-three/offscreen` package

This is marked as experimental and should be behind a feature flag.

```typescript
// Basic structure for future implementation
import { lazy, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

// Check for OffscreenCanvas support
const supportsOffscreen = typeof OffscreenCanvas !== 'undefined';

// Conditionally use offscreen rendering
export const OptimizedCanvas = supportsOffscreen
  ? lazy(() => import('@react-three/offscreen').then(m => ({ default: m.Canvas })))
  : Canvas;
```

### Task 4.2: WebGPU Exploration (Future)

**Status:** Experimental, not recommended for production yet
**Reference:** Three.js WebGPURenderer is available but not stable

Mark as Q2 2026 roadmap item when WebGPU support reaches 80%+ browser coverage.

---

## Testing Checklist

### Performance Tests
- [ ] Run Lighthouse on cinematic page
- [ ] Profile with Chrome DevTools (no major GC during animation)
- [ ] Test on low-end Android device (Xiaomi Redmi, etc.)
- [ ] Test on iPhone SE (lowest tier iOS device)
- [ ] Verify 30+ FPS on all devices after quality adaptation

### Functional Tests
- [ ] All 5 cinematic variants play correctly
- [ ] Skip button works (keyboard Escape)
- [ ] Safe mode triggers on low FPS
- [ ] WebGL context loss shows fallback UI
- [ ] Analytics events fire correctly
- [ ] Opt-out toggle persists across sessions

### Cross-Browser Tests
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS and iOS)
- [ ] Edge (latest)

---

## Rollout Strategy

### Phase 1: Internal Testing
- Deploy to staging environment
- QA team runs full test matrix
- Monitor analytics for errors

### Phase 2: Canary Release (10%)
- Enable for 10% of users via feature flag
- Monitor `cinematic_error` events
- Compare performance metrics with control group

### Phase 3: General Availability
- Roll out to 100% of users
- Remove feature flags
- Update documentation

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Avg FPS (mobile) | ~25 | 35+ | PostHog `cinematic_performance` |
| Breakthrough completion rate | 34% | 50% | PostHog dashboard |
| WebGL crash rate | Unknown | <0.1% | `cinematic_error` events |
| GC events during cinematic | ~5/sec | <1/sec | Chrome DevTools |

---

## Dependencies

No new dependencies required for Phase 1-3.

**Optional for Phase 4:**
- `@react-three/offscreen` (OffscreenCanvas)
- Three.js 0.168+ (already recommended upgrade)

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 2-3 hours | None |
| Phase 2 | 2-3 hours | Phase 1 |
| Phase 3 | 1-2 hours | Phase 1 |
| Phase 4 | 4-8 hours | All phases |

**Total: 1 day for core improvements**
