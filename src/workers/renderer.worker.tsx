import React, { Suspense } from "react";
import { createRoot, useFrame, useThree } from "@react-three/fiber";
import { SceneLighting } from "@/components/3d/SceneLighting";
import { PremiumSpiral } from "@/components/3d/PremiumSpiral";
import { EffectsHandler } from "@/components/3d/EffectsHandler";
import type { DeviceCapabilities } from "@/lib/cinematics/types";
import * as THREE from "three";

interface RendererInitMessage {
  type: "init";
  canvas: OffscreenCanvas;
  dpr: number;
  size: { width: number; height: number };
  capabilities: DeviceCapabilities;
  reducedMotion: boolean;
}

interface RendererResizeMessage {
  type: "resize";
  size: { width: number; height: number };
}

interface WorkerSceneProps {
  capabilities: DeviceCapabilities;
  reducedMotion: boolean;
}

function WorkerCameraOrbit({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, invalidate } = useThree();

  useFrame((_, delta) => {
    if (reducedMotion) return;
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.15);
    camera.lookAt(0, 0, 0);
    invalidate();
  });

  return null;
}

function WorkerScene({ capabilities, reducedMotion }: WorkerSceneProps) {
  return (
    <>
      <SceneLighting capabilities={capabilities} enableEnvironment={!reducedMotion} />
      <PremiumSpiral capabilities={capabilities} reducedMotion={reducedMotion} />
      <WorkerCameraOrbit reducedMotion={reducedMotion} />
      <EffectsHandler capabilities={capabilities} reducedMotion={reducedMotion} />
    </>
  );
}

let root: ReturnType<typeof createRoot> | null = null;
let latestConfig: {
  dpr: number;
  size: { width: number; height: number };
  capabilities: DeviceCapabilities;
  reducedMotion: boolean;
} | null = null;

self.onmessage = (event: MessageEvent<RendererInitMessage | RendererResizeMessage>) => {
  if (event.data.type === "init") {
    const { canvas, dpr, size, capabilities, reducedMotion } = event.data;
    latestConfig = { dpr, size, capabilities, reducedMotion };

    root = createRoot(canvas);
    root.configure({
      dpr,
      size: { width: size.width, height: size.height, top: 0, left: 0 },
      frameloop: "demand",
      camera: { position: [5, 3, 5], fov: 60 },
      gl: { antialias: true },
      events: undefined,
      onCreated: ({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      },
    });

    root.render(
      <Suspense fallback={null}>
        <WorkerScene capabilities={capabilities} reducedMotion={reducedMotion} />
      </Suspense>
    );
  }

  if (event.data.type === "resize" && root && latestConfig) {
    root.configure({
      dpr: latestConfig.dpr,
      size: { width: event.data.size.width, height: event.data.size.height, top: 0, left: 0 },
    });
  }
};
