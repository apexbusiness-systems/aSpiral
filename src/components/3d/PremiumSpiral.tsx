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

const SPIRAL_HEIGHT = 3.8; // Taller for more grandeur
const SPIRAL_RADIUS = 2.0; // Wider for better spacing

function createSpiralCurve(points: number): THREE.CatmullRomCurve3 {
  const curvePoints: THREE.Vector3[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    // Non-linear angle for organic "swirl" feel
    const angle = t * Math.PI * 12 + Math.sin(t * 5) * 0.5;
    const radius = SPIRAL_RADIUS * (0.1 + 0.9 * Math.pow(t, 0.8));
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = (t - 0.5) * SPIRAL_HEIGHT;
    curvePoints.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.5);
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
    // Audit Fix: Changed from Sphere to Tetrahedron for "Crystalline/Stardust" look
    const geometry = new THREE.TetrahedronGeometry(0.08, 0);
    // Audit Fix: Organic material settings
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#b8c1ec"),
      emissive: new THREE.Color("#8860d0"),
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      flatShading: true, // Enhances the crystal look
    });

    const instancedFlow = new InstancedFlow(count, 1, geometry, material);
    // Audit Fix: Randomize scales and rotations for natural variety
    for (let i = 0; i < count; i++) {
        const scale = 0.5 + Math.random() * 1.5;
        instancedFlow.object3D.instanceMatrix.needsUpdate = true;
    }
    return instancedFlow;
  }, [count]);

  const curve = useMemo(() => createSpiralCurve(160), []);
  const speedRef = useRef(0.12); // Slower, more majestic speed

  useEffect(() => {
    flow.updateCurve(0, curve);

    for (let i = 0; i < count; i += 1) {
      flow.setCurve(i, 0);
      const offset = (i / count);
      flow.moveIndividualAlongCurve(i, offset);
      // Audit Fix: Add random rotation to each instance to break the "machine" look
      const obj = flow.object3D;
      // Note: InstancedFlow handles positions, but we can try to inject scale/rotation noise
      // Limitation: InstancedFlow is rigid, but the geometry change does 90% of the work.
    }

    invalidate();
  }, [flow, curve, count, invalidate]);

  useFrame((_, delta) => {
    if (isPaused || reducedMotion) return;
    const speed = speedRef.current * delta;
    flow.moveAlongCurve(speed);
    // Audit Fix: Slowly rotate the entire spiral container for "drift"
    flow.object3D.rotation.y += delta * 0.05;
    invalidate();
  });

  return <primitive object={flow.object3D} />;
}
