/**
 * useBreakthroughDirector Hook
 * React hook for integrating the Breakthrough Director with components
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  getBreakthroughDirector,
  type BreakthroughDirector,
} from '@/lib/breakthrough/director';
import type { DirectorPhase, MutatedVariant, QualityTier } from '@/lib/breakthrough/types';
import { prefersReducedMotion } from '@/lib/performance/optimizer';
import { addBreadcrumb } from '@/lib/debugOverlay';

interface UseBreakthroughDirectorOptions {
  onComplete?: () => void;
  onAbort?: (reason: string) => void;
  qualityTier?: QualityTier;
  reducedMotion?: boolean;
  /** Callback to pause physics worker during breakthrough */
  onPausePhysics?: () => void;
  /** Callback to resume physics worker after breakthrough */
  onResumePhysics?: () => void;
}

interface UseBreakthroughDirectorReturn {
  phase: DirectorPhase;
  variant: MutatedVariant | null;
  isSafeMode: boolean;
  prewarm: (entities: Array<{ type: string; label: string; metadata?: { valence?: number } }>, breakthroughType?: string) => Promise<MutatedVariant>;
  play: (variant?: MutatedVariant) => Promise<void>;
  complete: () => void;
  abort: (reason?: string) => void;
  reportFPS: (fps: number) => void;
}

export function useBreakthroughDirector(
  options: UseBreakthroughDirectorOptions = {}
): UseBreakthroughDirectorReturn {
  const {
    onComplete,
    onAbort,
    qualityTier = 'mid',
    reducedMotion = prefersReducedMotion(),
    onPausePhysics,
    onResumePhysics,
  } = options;
  
  const directorRef = useRef<BreakthroughDirector | null>(null);
  const [phase, setPhase] = useState<DirectorPhase>('idle');
  const [variant, setVariant] = useState<MutatedVariant | null>(null);
  const [isSafeMode, setIsSafeMode] = useState(false);
  const lastPhaseRef = useRef<DirectorPhase>('idle');
  const lastVariantIdRef = useRef<string | null>(null);
  const lastSafeModeRef = useRef(false);
  
  // Initialize director
  useEffect(() => {
    directorRef.current = getBreakthroughDirector();
    
    directorRef.current.setCallbacks({
      onComplete: () => {
        onComplete?.();
      },
      onAbort: (reason) => {
        onAbort?.(reason);
      },
      onPhaseChange: (newPhase) => {
        if (lastPhaseRef.current !== newPhase) {
          lastPhaseRef.current = newPhase;
          setPhase(newPhase);
          addBreadcrumb({ type: 'director', message: `phase:${newPhase}` });
        }
        
        // Update variant and safe mode state
        if (directorRef.current) {
          const currentVariant = directorRef.current.getCurrentVariant();
          const nextVariantId = currentVariant?.id ?? null;
          if (lastVariantIdRef.current !== nextVariantId) {
            lastVariantIdRef.current = nextVariantId;
            setVariant(currentVariant);
          }

          const nextSafeMode = directorRef.current.isSafeMode();
          if (lastSafeModeRef.current !== nextSafeMode) {
            lastSafeModeRef.current = nextSafeMode;
            setIsSafeMode(nextSafeMode);
          }
        }
      },
    });
    
    // Set physics callbacks for pausing during breakthrough
    directorRef.current.setPhysicsCallbacks({
      onPause: onPausePhysics,
      onResume: onResumePhysics,
    });
    
    return () => {
      // Don't dispose singleton, just clear callbacks
      directorRef.current?.setCallbacks({});
      directorRef.current?.setPhysicsCallbacks({});
    };
  }, [onComplete, onAbort, onPausePhysics, onResumePhysics]);
  
  const prewarm = useCallback(
    async (
      entities: Array<{ type: string; label: string; metadata?: { valence?: number } }>,
      breakthroughType?: string
    ): Promise<MutatedVariant> => {
      if (!directorRef.current) {
        throw new Error('Director not initialized');
      }
      
      return directorRef.current.prewarm(
        entities,
        breakthroughType,
        qualityTier,
        reducedMotion
      );
    },
    [qualityTier, reducedMotion]
  );
  
  const play = useCallback(
    async (playVariant?: MutatedVariant): Promise<void> => {
      if (!directorRef.current) {
        throw new Error('Director not initialized');
      }
      
      await directorRef.current.play(playVariant, qualityTier);
    },
    [qualityTier]
  );
  
  const complete = useCallback(() => {
    directorRef.current?.complete();
  }, []);
  
  const abort = useCallback((reason?: string) => {
    directorRef.current?.abort(reason);
  }, []);
  
  const reportFPS = useCallback((fps: number) => {
    directorRef.current?.reportFPS(fps);
  }, []);
  
  return {
    phase,
    variant,
    isSafeMode,
    prewarm,
    play,
    complete,
    abort,
    reportFPS,
  };
}
