import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { prefersReducedMotion } from "@/lib/performance/optimizer";
import type CameraControlsImpl from "camera-controls";

interface CameraRigProps {
  minDistance?: number;
  maxDistance?: number;
  autoRotate?: boolean;
}

export function CameraRig({ minDistance = 3, maxDistance = 15, autoRotate = true }: CameraRigProps) {
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    invalidate();
  }, [invalidate]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (autoRotate && !reducedMotion) {
      controls.rotate(0.15 * delta, 0, false);
    }

    const needsUpdate = controls.update(delta);
    if (needsUpdate) {
      invalidate();
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={minDistance}
      maxDistance={maxDistance}
      dollyToCursor={false}
      infinityDolly={false}
      smoothTime={0.35}
      draggingSmoothTime={0.2}
      restThreshold={0.01}
      azimuthRotateSpeed={0.6}
      polarRotateSpeed={0.6}
      onChange={() => invalidate()}
    />
  );
}
