/**
 * Cinematic Player - Main Orchestrator
 * Handles variant selection, audio, analytics, and skip functionality
 */

import { useState, useEffect, useRef, Suspense } from 'react';
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
  const [qualitySettings, setQualitySettings] = useState(() => {
    const aq = new AdaptiveQuality(setQualitySettings);
    return aq.getQualitySettings();
  });

  // Audio
  const audioManager = useRef<AudioManager | null>(null);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [particleCount, setParticleCount] = useState(config.particles?.count || 1000);
  const startTimeRef = useRef<number>(0);

  // Check for reduced motion preference
  const shouldReduceMotion = reducedMotion || prefersReducedMotion();

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

    return () => {
      // Cleanup
      adaptiveQuality.current?.dispose();
      audioManager.current?.dispose();
    };
  }, [selectedVariant, config, autoPlay, enableAnalytics, onStart]);

  // Update particle count based on quality
  useEffect(() => {
    if (config.particles) {
      const newCount = calculateParticleCount(config.particles.count, qualitySettings);
      setParticleCount(newCount);
    }
  }, [qualitySettings, config.particles]);

  // Handle completion
  const handleComplete = () => {
    setIsPlaying(false);
    audioManager.current?.stop();

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
  };

  // Handle skip
  const handleSkip = () => {
    if (!allowSkip || !isPlaying) return;

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
    onComplete?.(); // Treat skip as completion
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
  }, [allowSkip, isPlaying]);

  // Update adaptive quality
  useEffect(() => {
    const interval = setInterval(() => {
      adaptiveQuality.current?.update();
    }, 16); // Update every frame (~60fps)

    return () => clearInterval(interval);
  }, []);

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
          />
        )}
      </EffectComposer>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{
          antialias: qualitySettings.antialias,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={qualitySettings.renderScale}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#000000']} />

          {/* Cinematic Variant */}
          {isPlaying && renderVariant()}

          {/* Post-Processing */}
          {renderPostProcessing()}
        </Suspense>
      </Canvas>

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
