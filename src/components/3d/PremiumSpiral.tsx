import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { InstancedFlow } from "three/examples/jsm/modifiers/CurveModifier.js";
import { detectDeviceCapabilities, prefersReducedMotion } from "@/lib/performance/optimizer";
import type { DeviceCapabilities } from "@/lib/cinematics/types";
import * as THREE from "three";

interface PremiumSpiralProps {
  isPaused?: boolean;
  instanceCount?: number;
  capabilities?: DeviceCapabilities;
  reducedMotion?: boolean;
}

const SPIRAL_HEIGHT = 3.2;
const SPIRAL_RADIUS = 1.6;

function createSpiralCurve(points: number): THREE.CatmullRomCurve3 {
  const curvePoints: THREE.Vector3[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const angle = t * Math.PI * 10;
    const radius = SPIRAL_RADIUS * (0.2 + 0.8 * t);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = (t - 0.5) * SPIRAL_HEIGHT;
    curvePoints.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.8);
}

export function PremiumSpiral({
  isPaused = false,
  instanceCount,
  capabilities,
  reducedMotion: reducedMotionOverride,
}: PremiumSpiralProps) {
  const invalidate = useThree((state) => state.invalidate);
  const reducedMotion = useMemo(
    () => reducedMotionOverride ?? prefersReducedMotion(),
    [reducedMotionOverride]
  );
  const resolvedCapabilities = useMemo(
    () => capabilities ?? detectDeviceCapabilities(),
    [capabilities]
  );

  const count = useMemo(() => {
    if (instanceCount) return instanceCount;
    if (resolvedCapabilities.deviceType === "mobile" || resolvedCapabilities.gpuTier === 1) return 160;
    if (resolvedCapabilities.gpuTier === 2) return 260;
    return 360;
  }, [resolvedCapabilities, instanceCount]);

  const flow = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.06, 12, 12);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#9f9cff"),
      emissive: new THREE.Color("#7c83ff"),
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
    });

    return new InstancedFlow(count, 1, geometry, material);
  }, [count]);

  const curve = useMemo(() => createSpiralCurve(140), []);
  const speedRef = useRef(0.18);

  useEffect(() => {
    flow.updateCurve(0, curve);

    for (let i = 0; i < count; i += 1) {
      flow.setCurve(i, 0);
      const offset = (i / count) * 1.5;
      flow.moveIndividualAlongCurve(i, offset);
    }

    invalidate();
  }, [flow, curve, count, invalidate]);

  useFrame((_, delta) => {
    if (isPaused || reducedMotion) return;
    const speed = speedRef.current * delta;
    flow.moveAlongCurve(speed);
    invalidate();
  });

  return <primitive object={flow.object3D} />;
}
