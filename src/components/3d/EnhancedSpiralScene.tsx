import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { detectDeviceCapabilities, prefersReducedMotion } from "@/lib/performance/optimizer";
import { SpiralEntities } from "./SpiralEntities";
import { FrictionEffects } from "./FrictionEffects";
import { SceneLighting } from "./SceneLighting";
import { PremiumSpiral } from "./PremiumSpiral";
import { EffectsHandler } from "./EffectsHandler";
import { CameraRig } from "./CameraRig";
import { OffscreenSpiralCanvas } from "./OffscreenSpiralCanvas";
import { isRendererWorkerEnabled } from "@/lib/rendererFlags";
import { useSessionStore } from "@/stores/sessionStore";
import type { DeviceCapabilities } from "@/lib/cinematics/types";

function supportsOffscreenCanvas(): boolean {
  return (
    typeof HTMLCanvasElement !== "undefined" &&
    "transferControlToOffscreen" in HTMLCanvasElement.prototype
  );
}

function useDeviceProfile(): { capabilities: DeviceCapabilities; reducedMotion: boolean } {
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  return { capabilities, reducedMotion };
}

function EnhancedSceneContent({
  capabilities,
  reducedMotion,
}: {
  capabilities: DeviceCapabilities;
  reducedMotion: boolean;
}) {
  const isBreakthroughImminent = useSessionStore((state) => state.isBreakthroughImminent);
  const isBreakthroughActive = useSessionStore((state) => state.isBreakthroughActive);

  const showPremiumSpiral = isBreakthroughImminent || isBreakthroughActive;

  return (
    <>
      <SceneLighting capabilities={capabilities} enableEnvironment={!reducedMotion} />
      {showPremiumSpiral && (
        <PremiumSpiral capabilities={capabilities} reducedMotion={reducedMotion} />
      )}
      <SpiralEntities />
      <FrictionEffects />
      <CameraRig autoRotate={!reducedMotion} />
      <EffectsHandler capabilities={capabilities} reducedMotion={reducedMotion} />
    </>
  );
}

export interface EnhancedSpiralSceneProps {
  /**
   * When true, always render an interactive R3F Canvas (camera controls).
   * OffscreenCanvas worker rendering is intentionally non-interactive.
   */
  interactive?: boolean;
}

export function EnhancedSpiralScene({ interactive = true }: EnhancedSpiralSceneProps) {
  const currentSession = useSessionStore((state) => state.currentSession);
  const hasEntities = (currentSession?.entities?.length || 0) > 0;
  const { capabilities, reducedMotion } = useDeviceProfile();

  // IMPORTANT: The worker/offscreen renderer is non-interactive.
  // If this scene is used as the user's "stage" (camera manipulation), force interactive Canvas.
  const useWorker =
    !interactive &&
    supportsOffscreenCanvas() &&
    isRendererWorkerEnabled() &&
    !hasEntities;

  if (useWorker) {
    return (
      <div className="h-full w-full gpu-accelerated">
        <OffscreenSpiralCanvas className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="h-full w-full gpu-accelerated">
      <Canvas
        camera={{ position: [5, 3, 5], fov: 60 }}
        style={{ background: "transparent" }}
        dpr={capabilities.deviceType === "mobile" ? [1, 1.25] : [1, 1.6]}
        performance={{ min: capabilities.gpuTier === 1 ? 0.4 : 0.6 }}
        frameloop="demand"
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Suspense fallback={null}>
          <EnhancedSceneContent capabilities={capabilities} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}