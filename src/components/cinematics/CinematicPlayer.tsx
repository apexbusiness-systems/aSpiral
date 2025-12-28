/**
 * Cinematic Player - Main Orchestrator
 * Handles variant selection, audio, analytics, and skip functionality
 * Includes fallback timeout for WebGL failures
 */

import { useState, useEffect, useRef, Suspense, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// Cinematic Variants
import { SpiralAscend } from './SpiralAscend';
import { ParticleExplosion } from './ParticleExplosion';
import { PortalReveal } from './PortalReveal';
import { MatrixDecode } from './MatrixDecode';
import { SpaceWarp } from './SpaceWarp';

// Utilities
import { getCinematicConfig, getRandomVariant } from '@/lib/cinematics/configs';
import { AudioManager } from '@/lib/cinematics/AudioManager';
import { AdaptiveQuality, prefersReducedMotion, calculateParticleCount } from '@/lib/performance/optimizer';
import { analytics } from '@/lib/analytics';
import type { CinematicPlayerProps, CinematicVariant } from '@/lib/cinematics/types';

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
    console.warn('[CinematicPlayer] WebGL error caught:', error.message);
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
}: CinematicPlayerProps) {
  // Select variant
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
  const startTimeRef = useRef<number>(0);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for reduced motion preference
  const shouldReduceMotion = reducedMotion || prefersReducedMotion();

  // Handle completion (deduplicated)
  const handleComplete = useRef(() => {
    if (hasCompleted) return;
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
        });
      }
    }

    onComplete?.();
  }).current;

  // Handle WebGL/canvas errors - immediately complete
  const handleWebGLError = useRef(() => {
    console.warn('[CinematicPlayer] WebGL error - skipping to completion');
    handleComplete();
  }).current;

  // Initialize
  useEffect(() => {
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

    if (autoPlay) {
      setIsPlaying(true);
      audioManager.current.play();
    }

    // FALLBACK: Force completion after max duration to prevent getting stuck
    fallbackTimeoutRef.current = setTimeout(() => {
      console.warn('[CinematicPlayer] Fallback timeout triggered - forcing completion');
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
  }, [selectedVariant, config, autoPlay, enableAnalytics, onStart, handleComplete]);

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
    console.warn('[CinematicPlayer] WebGL context lost');
    handleWebGLError();
  };

  // Render variant component
  const renderVariant = () => {
    const props = { onComplete: handleComplete, particleCount };

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
    const hasBloom = effects.some((e) => e.type === 'bloom');
    const hasChromaticAberration = effects.some((e) => e.type === 'chromaticAberration');

    return (
      <EffectComposer>
        {hasBloom && (
          <Bloom
            intensity={effects.find((e) => e.type === 'bloom')?.intensity || 1.5}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.9}
            blendFunction={BlendFunction.ADD}
          />
        )}
        {hasChromaticAberration && (
          <ChromaticAberration
            offset={
              new THREE.Vector2(0.002, 0.002).multiplyScalar(
                effects.find((e) => e.type === 'chromaticAberration')?.intensity || 1.0
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

            {/* Cinematic Variant */}
            {isPlaying && renderVariant()}

            {/* Post-Processing */}
            {renderPostProcessing()}
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>

      {/* Skip Button */}
      {allowSkip && isPlaying && (
        <button
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
