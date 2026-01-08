import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { detectDeviceCapabilities } from "@/lib/performance/optimizer";

// ============================================================================
// AURORA PLATFORM - Minimal scene with floating platform and aurora glows
// ============================================================================

function AuroraGlow() {
  const glowRef = useRef<THREE.Mesh>(null);
  const glow2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (glowRef.current) {
      glowRef.current.rotation.z = t * 0.05;
      const scale = 1 + Math.sin(t * 0.5) * 0.1;
      glowRef.current.scale.set(scale, scale, 1);
    }
    
    if (glow2Ref.current) {
      glow2Ref.current.rotation.z = -t * 0.03;
      const scale = 1 + Math.sin(t * 0.3 + Math.PI) * 0.08;
      glow2Ref.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      {/* Primary aurora glow */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[2, 5, 64]} />
        <meshBasicMaterial
          color="#7c3aed"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary aurora glow */}
      <mesh ref={glow2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[1.5, 4, 64]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Subtle center glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[2, 64]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.08}
        />
      </mesh>
    </group>
  );
}

function EmptyPlatform() {
  return (
    <group position={[0, -1, 0]}>
      {/* Subtle platform disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 64]} />
        <meshStandardMaterial
          color="#1a1a2e"
          transparent
          opacity={0.4}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Platform edge glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.8, 3, 64]} />
        <meshBasicMaterial
          color="#6d28d9"
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

function SceneContent() {
  return (
    <>
      {/* Soft ambient lighting */}
      <ambientLight intensity={0.3} />
      
      {/* Subtle purple point lights for atmosphere */}
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#c4b5fd" />
      <pointLight position={[-5, 3, -5]} intensity={0.3} color="#7c3aed" />

      <EmptyPlatform />
      <AuroraGlow />
    </>
  );
}

export function HaloOrbScene() {
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);
  const dpr = capabilities.gpuTier === 1 ? [1, 1.5] : [1, 2];

  return (
    <div className="h-full w-full gpu-accelerated">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 50 }}
        style={{ background: "transparent" }}
        dpr={dpr as [number, number]}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
