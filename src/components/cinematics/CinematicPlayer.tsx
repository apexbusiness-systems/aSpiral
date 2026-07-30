/**
 * Cinematic Player - Main Orchestrator
 * Handles variant selection, audio, analytics, and skip functionality
 * Includes fallback timeout for WebGL failures
 * Integrated with Breakthrough V2 Director for enhanced variety and reliability
 * NOSONAR - R3F intrinsic JSX props: attach, args - valid R3F props, not HTML attributes.
 */

import { useState, useEffect, useRef, Suspense, Component, ReactNode, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// Cinematic Variants
import { SpiralAscend } from './SpiralAscend';
import { ParticleExplosion } from './ParticleExplosion';
import { PortalReveal } from './PortalReveal';
import { MatrixDecode } from './MatrixDecode';
import { SpaceWarp } from './SpaceWarp';
import { BreakthroughFallback } from './BreakthroughFallback';

// Breakthrough V2 System
import { useBreakthroughDirector } from '@/hooks/useBreakthroughDirector';
import { isBreakthroughV2Enabled } from '@/lib/breakthrough/types';
import type { MutatedVariant, QualityTier } from '@/lib/breakthrough/types';

// Utilities
import { getCinematicConfig, getRandomVariant } from '@/lib/cinematics/configs';
import { AudioManager } from '@/lib/cinematics/AudioManager';
import { AdaptiveQuality, prefersReducedMotion, calculateParticleCount, detectDeviceTier, detectDeviceCapabilities } from '@/lib/performance/optimizer';
import { analytics } from '@/lib/analytics';
import type { CinematicPlayerProps, CinematicVariant } from '@/lib/cinematics/types';
import { addBreadcrumb } from '@/lib/debugOverlay';
import { featureFlags } from '@/lib/featureFlags';
import { createLogger } from '@/lib/logger';

// Create module-level logger
const logger = createLogger('CinematicPlayer');

// Error Boundary for WebGL crashes
interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    logger.warn('WebGL error caught', { errorMessage: error.message });
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null; // Render nothing, let fallback handle it
    }
    return this.props.children;
  }
}

// Maximum cinematic duration before forcing completion (fallback)
const MAX_CINEMATIC_DURATION_MS = 15000; // 15 seconds

// FPS Reporter component for V2 director integration
function FPSReporter({ onFPS }: { onFPS: (fps: number) => void }) {
  const lastTime = useRef(performance.now());
  
  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTime.current;
    lastTime.current = now;
    
    if (delta > 0) {
      const fps = 1000 / delta;
      onFPS(fps);
    }
  });
  
  return null;
}

// Extended props interface for V2
interface CinematicPlayerPropsV2 extends CinematicPlayerProps {
  sessionEntities?: Array<{ type: string; label: string; metadata?: { valence?: number } }>;
  breakthroughType?: string;
}

export function CinematicPlayer({
  variant,
  onComplete,
  onSkip,
  onStart,
  allowSkip = true,
  autoPlay = true,
  enableAnalytics = true,
  reducedMotion = false,
  className = '',
  sessionEntities = [],
  breakthroughType,
}: CinematicPlayerPropsV2) {
  // Check if V2 is enabled
  const useV2 = isBreakthroughV2Enabled();
  const deviceTier = detectDeviceTier();
  const cinematicsEnabled = featureFlags.cinematicsEnabled;
  
  // V2 Director integration
  const {
    phase: directorPhase,
    variant: v2Variant,
    isSafeMode,
    prewarm,
    play: playDirector,
    complete: completeDirector,
    abort: abortDirector,
    reportFPS,
  } = useBreakthroughDirector({
    onComplete,
    onAbort: (reason) => {
      logger.info('V2 aborted', { reason });
      onSkip?.();
    },
    qualityTier: deviceTier,
    reducedMotion,
  });

  // Select variant (V1 fallback)
  const [selectedVariant] = useState<CinematicVariant>(variant || getRandomVariant());
  const config = getCinematicConfig(selectedVariant);

  // Performance & Quality
  const adaptiveQuality = useRef<AdaptiveQuality | null>(null);
  const [qualitySettings, setQualitySettings] = useState<ReturnType<AdaptiveQuality['getQualitySettings']>>({
    particleMultiplier: 1,
    enablePostProcessing: true,
    enableShadows: true,
    renderScale: 1,
    antialias: true,
  });

  // Audio
  const audioManager = useRef<AudioManager | null>(null);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [particleCount, setParticleCount] = useState(config.particles?.count || 1000);
  const [hasCompleted, setHasCompleted] = useState(false);
  const hasCompletedRef = useRef(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const startTimeRef = useRef<number>(0);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [v2Initialized, setV2Initialized] = useState(false);

  // Check for reduced motion preference
  const shouldReduceMotion = reducedMotion || prefersReducedMotion();

  const handleComplete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setHasCompleted(true);
    setIsPlaying(false);
    audioManager.current?.stop();

    // Clear fallback timeout
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    if (enableAnalytics) {
      const duration = performance.now() - startTimeRef.current;
      const metrics = adaptiveQuality.current?.getMetrics();
      const capabilities = detectDeviceCapabilities();

      analytics.trackCinematic('completed', {
        variant: selectedVariant,
        duration,
      });

      if (metrics) {
        analytics.trackPerformance({
          variant: selectedVariant,
          ...metrics,
          duration,
          particleCount,
          deviceType: analytics.getDeviceType(),
          // Enhanced GPU context for debugging
          gpuTier: capabilities.gpuTier,
          gpuRenderer: capabilities.gpuRenderer,
          qualityMultiplier: qualitySettings.particleMultiplier,
          wasAdaptiveReduced: qualitySettings.particleMultiplier < 1,
        });
      }
    }

    addBreadcrumb({ type: 'cinematic', message: 'complete' });
    onComplete?.();
  }, [enableAnalytics, particleCount, qualitySettings.particleMultiplier, selectedVariant, onComplete]);

  const handleV2Complete = useCallback(() => {
    completeDirector();
    handleComplete();
  }, [completeDirector, handleComplete]);

  // Handle WebGL/canvas errors - show fallback UI then complete
  const handleWebGLError = useCallback(() => {
    logger.warn('WebGL error - showing fallback UI');
    setWebglFailed(true);
    audioManager.current?.stop();
    addBreadcrumb({ type: 'cinematic', message: 'webgl_error' });

    // Brief delay to show fallback UI before completion
    setTimeout(() => {
      handleComplete();
    }, 1500);
  }, [handleComplete]);

  // Kill switch: bypass cinematics
  useEffect(() => {
    if (!cinematicsEnabled) {
      addBreadcrumb({ type: 'cinematic', message: 'disabled' });
      handleComplete();
    }
  }, [cinematicsEnabled, handleComplete]);

  // Initialize V2 if enabled
  useEffect(() => {
    if (!cinematicsEnabled) return;
    if (useV2 && !v2Initialized) {
      setV2Initialized(true);
      prewarm(sessionEntities, breakthroughType)
        .then((variant) => {
          logger.info('V2 prewarmed', { variantId: variant.id });
          if (autoPlay) {
            playDirector(variant);
          }
        })
        .catch((err) => {
          logger.error('V2 prewarm failed', err instanceof Error ? err : new Error(String(err)));
          abortDirector('prewarm_failed');
          handleComplete();
        });
    }
  }, [useV2, v2Initialized, sessionEntities, breakthroughType, autoPlay, prewarm, playDirector, cinematicsEnabled, abortDirector, handleComplete]);

  // Initialize (V1 mode)
  useEffect(() => {
    // Skip V1 init if V2 is enabled
    if (useV2 || !cinematicsEnabled) return;
    
    // Create adaptive quality manager
    adaptiveQuality.current = new AdaptiveQuality(setQualitySettings);
    adaptiveQuality.current.start();

    // Create audio manager
    audioManager.current = new AudioManager(config.audio);
    audioManager.current.preload();

    // Track start event
    if (enableAnalytics) {
      analytics.trackCinematic('started', {
        variant: selectedVariant,
      });
    }

    startTimeRef.current = performance.now();
    onStart?.();
    addBreadcrumb({ type: 'cinematic', message: 'start', data: { variant: selectedVariant } });

    if (autoPlay) {
      setIsPlaying(true);
      audioManager.current.play();
    }

    // FALLBACK: Force completion after max duration to prevent getting stuck
    fallbackTimeoutRef.current = setTimeout(() => {
      logger.warn('Fallback timeout triggered - forcing completion', { maxDuration: MAX_CINEMATIC_DURATION_MS });
      handleComplete();
    }, MAX_CINEMATIC_DURATION_MS);

    return () => {
      // Cleanup
      adaptiveQuality.current?.dispose();
      audioManager.current?.dispose();
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [useV2, selectedVariant, config, autoPlay, enableAnalytics, onStart, handleComplete, cinematicsEnabled]);

  // Update particle count based on quality
  useEffect(() => {
    if (config.particles) {
      const newCount = calculateParticleCount(config.particles.count, qualitySettings);
      setParticleCount(newCount);
    }
  }, [qualitySettings, config.particles]);

  // Handle skip
  const handleSkip = () => {
    if (!allowSkip || !isPlaying || hasCompleted) return;

    setIsPlaying(false);
    audioManager.current?.stop(true);

    if (enableAnalytics) {
      const duration = performance.now() - startTimeRef.current;
      const progress = (duration / config.duration) * 100;

      analytics.trackCinematic('skipped', {
        variant: selectedVariant,
        progress,
      });
    }

    onSkip?.();
    handleComplete(); // Treat skip as completion
  };

  // Keyboard shortcut for skip (Escape)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && allowSkip) {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleSkip is stable via useCallback
  }, [allowSkip, isPlaying, hasCompleted]);

  // Update adaptive quality
  useEffect(() => {
    const interval = setInterval(() => {
      adaptiveQuality.current?.update();
    }, 16); // Update every frame (~60fps)

    return () => clearInterval(interval);
  }, []);

  // Handle canvas context loss
  const handleContextLost = (event: Event) => {
    event.preventDefault();
    logger.warn('WebGL context lost');
    handleWebGLError();
  };

  // Render variant component
  const renderVariant = () => {
    const props = { onComplete: useV2 ? handleV2Complete : handleComplete, particleCount };

    switch (selectedVariant) {
      case 'spiral_ascend':
        return <SpiralAscend {...props} />;
      case 'particle_explosion':
        return <ParticleExplosion {...props} />;
      case 'portal_reveal':
        return <PortalReveal {...props} />;
      case 'matrix_decode':
        return <MatrixDecode {...props} />;
      case 'space_warp':
        return <SpaceWarp {...props} />;
      default:
        return <SpiralAscend {...props} />;
    }
  };

  // Get post-processing effects for this variant
  const renderPostProcessing = () => {
    if (!qualitySettings.enablePostProcessing || shouldReduceMotion) {
      return null;
    }

    const effects = config.effects || [];

    // Performance Optimization: Cache the result of `.find()` to avoid redundant array
    // iterations, replacing previous implementation that used `.some()` followed by `.find()`.
    const bloomEffect = effects.find((e) => e.type === 'bloom');
    const chromaticAberrationEffect = effects.find((e) => e.type === 'chromaticAberration');

    return (
      <EffectComposer>
        {bloomEffect && (
          <Bloom
            intensity={bloomEffect.intensity || 1.5}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.9}
            blendFunction={BlendFunction.ADD}
          />
        )}
        {chromaticAberrationEffect && (
          <ChromaticAberration
            offset={
              new THREE.Vector2(0.002, 0.002).multiplyScalar(
                chromaticAberrationEffect.intensity || 1
              )
            }
            blendFunction={BlendFunction.NORMAL}
            radialModulation={false}
            modulationOffset={0}
          />
        )}
      </EffectComposer>
    );
  };

  // If already completed, render nothing
  if (hasCompleted) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* 3D Canvas with Error Boundary */}
      <WebGLErrorBoundary onError={handleWebGLError}>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{
            antialias: qualitySettings.antialias,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          dpr={qualitySettings.renderScale}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', handleContextLost);
          }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={['#000000']} />

            {/* FPS Reporter for V2 Director */}
            {useV2 && directorPhase === 'playing' && (
              <FPSReporter onFPS={reportFPS} />
            )}

            {/* V2 Safe Mode Fallback */}
            {useV2 && isSafeMode && directorPhase === 'playing' && (
              <BreakthroughFallback 
                onComplete={completeDirector}
                color={v2Variant?.finalColors?.[0] || '#60a5fa'}
              />
            )}

            {/* V2 Normal Playback or V1 Cinematic Variant */}
            {!useV2 && isPlaying && renderVariant()}
            {useV2 && !isSafeMode && directorPhase === 'playing' && renderVariant()}

            {/* Post-Processing */}
            {renderPostProcessing()}
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>

      {/* WebGL Failure Fallback UI */}
      {webglFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-purple-900/90 to-indigo-900/90 z-10">
          <div className="text-center animate-pulse">
            <div className="text-5xl mb-4">✨</div>
            <div className="text-3xl text-white font-display mb-4">Breakthrough Achieved!</div>
            <div className="text-lg text-purple-200">Preparing your insight...</div>
          </div>
        </div>
      )}

      {/* Skip Button */}
      {allowSkip && isPlaying && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute bottom-8 right-8 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-colors border border-white/20 font-medium"
          aria-label="Skip cinematic"
        >
          Skip (Esc)
        </button>
      )}

      {/* Screen Reader Announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {isPlaying ? `Playing ${config.displayName} cinematic` : 'Cinematic complete'}
      </div>
    </div>
  );
}
