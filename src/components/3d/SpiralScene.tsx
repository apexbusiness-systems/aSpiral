import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { detectDeviceCapabilities } from "@/lib/performance/optimizer";
import { SpiralEntities } from "./SpiralEntities";
import { FrictionEffects } from "./FrictionEffects";

function SceneContent() {
  // Adaptive star count based on device capabilities
  const starCount = useMemo(() => {
    const capabilities = detectDeviceCapabilities();

    // Low-end devices: minimal stars
    if (capabilities.deviceType === 'mobile' || capabilities.gpuTier === 1) {
      return 300;
    }

    // Mid-range: moderate stars
    if (capabilities.deviceType === 'tablet' || capabilities.gpuTier === 2) {
      return 500;
    }

    // High-end: full stars
    return 800;
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />

      {/* Environment - adaptive count for performance */}
      <Stars
        radius={80}
        depth={40}
        count={starCount}
        factor={3}
        saturation={0}
        fade
        speed={0.2}
      />
      
      {/* Spiral center indicator - simplified geometry */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 8, 48]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Ground plane hint - simplified */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ringGeometry args={[0.5, 5, 32]} />
        <meshBasicMaterial
          color="#1e1b4b"
          transparent
          opacity={0.2}
          side={2}
        />
      </mesh>
      
      {/* Entities */}
      <SpiralEntities />
      
      {/* Friction & Breakthrough Effects */}
      <FrictionEffects />
      
      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export function SpiralScene() {
  return (
    <div className="h-full w-full gpu-accelerated">
      <Canvas
        camera={{ position: [5, 3, 5], fov: 60 }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]} // Limit pixel ratio for performance
        performance={{ min: 0.5 }} // Allow quality reduction
        frameloop="demand" // Only render when needed
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
