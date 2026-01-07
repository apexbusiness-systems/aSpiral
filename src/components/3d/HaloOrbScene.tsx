import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles, Float } from "@react-three/drei";
import * as THREE from "three";
import { detectDeviceCapabilities } from "@/lib/performance/optimizer";
import { useSessionStore } from "@/stores/sessionStore";

// ============================================================================
// HALO ORB VISUAL - "Apple Polished" Aesthetic
// Replaces the chaotic spiral with a serene, glass-like orb and halo ring.
// ============================================================================

function GlassOrb() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Subtle breathing animation
  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.position.y = Math.sin(t * 0.5) * 0.2;
      meshRef.current.rotation.y = t * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshPhysicalMaterial
          roughness={0.1} // Glass-like
          metalness={0.1}
          transmission={0.9} // Glass transparency
          thickness={1.5} // Refraction depth
          color="#8b5cf6" // Dark purple base
          emissive="#6d28d9"
          emissiveIntensity={0.2}
          ior={1.5} // Refraction index
          clearcoat={1}
          clearcoatRoughness={0.1}
          attenuationTint="#ffffff"
          attenuationDistance={5}
        />
      </mesh>
    </Float>
  );
}

function HaloRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const t = state.clock.getElapsedTime();
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.2) * 0.1;
      ringRef.current.rotation.z = t * 0.05;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[3.5, 0.02, 16, 100]} />
      <meshBasicMaterial color="#a78bfa" transparent opacity={0.6} />
    </mesh>
  );
}

function ParticleField() {
  return (
    <Sparkles
      count={150}
      scale={8}
      size={2}
      speed={0.4}
      opacity={0.5}
      color="#ddd6fe"
    />
  );
}

function InnerCore() {
    const coreRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if(coreRef.current) {
            const t = state.clock.getElapsedTime();
             // Pulse scale based on audio (simulated here with sine) or just breathing
             const scale = 0.8 + Math.sin(t * 2) * 0.05;
             coreRef.current.scale.set(scale, scale, scale);
        }
    })

    return (
        <mesh ref={coreRef}>
            <sphereGeometry args={[1.0, 32, 32]} />
            <meshBasicMaterial color="#7c3aed" transparent opacity={0.8} />
        </mesh>
    )
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#c4b5fd" />
      <pointLight position={[-10, -10, -5]} intensity={1} color="#4c1d95" />

      <GlassOrb />
      <InnerCore />
      <HaloRing />
      <ParticleField />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
      />
    </>
  );
}

export function HaloOrbScene() {
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);

  // Performance optimization: lower pixel ratio on low-end devices
  const dpr = capabilities.gpuTier === 1 ? [1, 1.5] : [1, 2];

  return (
    <div className="h-full w-full gpu-accelerated">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        style={{ background: "transparent" }}
        dpr={dpr as any}
        gl={{
            alpha: true,
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
