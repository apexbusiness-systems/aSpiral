import { useMemo } from "react";
import { EffectComposer, Bloom, SMAA, Noise, Vignette, TiltShift2 } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { detectDeviceCapabilities, prefersReducedMotion } from "@/lib/performance/optimizer";
import type { DeviceCapabilities } from "@/lib/cinematics/types";

export interface EffectsHandlerProps {
  enabled?: boolean;
  capabilities?: DeviceCapabilities;
  reducedMotion?: boolean;
}

export function EffectsHandler({ enabled = true, capabilities, reducedMotion: reducedMotionOverride }: EffectsHandlerProps) {
  const resolvedCapabilities = useMemo(
    () => capabilities ?? detectDeviceCapabilities(),
    [capabilities]
  );
  const reducedMotion = useMemo(
    () => reducedMotionOverride ?? prefersReducedMotion(),
    [reducedMotionOverride]
  );
  const isLowTier = resolvedCapabilities.deviceType === "mobile" || resolvedCapabilities.gpuTier === 1;

  const config = useMemo(() => {
    return {
      bloom: enabled && !isLowTier,
      smaa: enabled,
      noise: enabled && !isLowTier && !reducedMotion,
      vignette: enabled,
      tiltShift: enabled && resolvedCapabilities.gpuTier >= 2 && !reducedMotion,
    };
  }, [enabled, isLowTier, reducedMotion, resolvedCapabilities.gpuTier]);

  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0}>
      {config.bloom && (
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.65}
          luminanceSmoothing={0.2}
        />
      )}
      {config.smaa && <SMAA />}
      {config.noise && (
        <Noise
          premultiply
          blendFunction={BlendFunction.SOFT_LIGHT}
          opacity={0.07}
        />
      )}
      {config.vignette && (
        <Vignette eskil={false} offset={0.2} darkness={0.9} />
      )}
      {config.tiltShift && (
        <TiltShift2
          blur={0.2}
          taper={0.6}
          samples={isLowTier ? 6 : 10}
        />
      )}
    </EffectComposer>
  );
}
