import { useMemo } from "react";
import { Environment } from "@react-three/drei";
import { detectDeviceCapabilities } from "@/lib/performance/optimizer";
import type { DeviceCapabilities } from "@/lib/cinematics/types";

interface SceneLightingProps {
  enableEnvironment?: boolean;
  capabilities?: DeviceCapabilities;
}

export function SceneLighting({ enableEnvironment = true, capabilities }: SceneLightingProps) {
  const resolvedCapabilities = useMemo(
    () => capabilities ?? detectDeviceCapabilities(),
    [capabilities]
  );
  const isLowTier = resolvedCapabilities.deviceType === "mobile" || resolvedCapabilities.gpuTier === 1;

  return (
    <>
      <ambientLight intensity={isLowTier ? 0.2 : 0.35} />
      <directionalLight position={[6, 6, 4]} intensity={isLowTier ? 0.6 : 1.1} color="#ffffff" />
      <directionalLight position={[-5, 4, -6]} intensity={isLowTier ? 0.3 : 0.7} color="#7c83ff" />
      <pointLight position={[0, -4, 6]} intensity={isLowTier ? 0.2 : 0.5} color="#9b8cff" />

      {enableEnvironment && !isLowTier && (
        <Environment
          preset="sunset"
          background={false}
          blur={0.4}
        />
      )}
    </>
  );
}
