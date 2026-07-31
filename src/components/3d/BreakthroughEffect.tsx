import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { secureMathRandom } from "@/lib/secureMathRandom";
import { prefersReducedMotion } from "@/lib/performance/optimizer";

// NOSONAR - This file uses React Three Fiber JSX intrinsics (position, args, transparent,
// intensity, distance, side, rotation, etc.) which are valid R3F props, not HTML attributes.

interface BreakthroughEffectProps {
  readonly isActive: boolean;
  readonly onComplete?: () => void;
}

// Particle for explosion
function Particle({
  initialPosition,
  color,
  velocity,
  size,
}: {
  initialPosition: THREE.Vector3;
  color: string;
  velocity: THREE.Vector3;
  size: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const life = useRef(1);
  const pos = useRef(initialPosition.clone());

  useFrame((_, delta) => {
    if (ref.current && life.current > 0) {
      pos.current.add(velocity.clone().multiplyScalar(delta));
      ref.current.position.copy(pos.current);
      life.current -= delta * 0.8;
      ref.current.scale.setScalar(size * life.current);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = life.current;
    }
  });

  if (life.current <= 0) return null;

  return (
    <mesh ref={ref} position={initialPosition}> {/* NOSONAR */}
      <sphereGeometry args={[0.1, 8, 8]} /> {/* NOSONAR */}
      <meshBasicMaterial color={color} transparent opacity={1} /> {/* NOSONAR */}
    </mesh>
  );
}

export function BreakthroughEffect({ isActive, onComplete }: BreakthroughEffectProps) {
  const sceneRef = useRef<THREE.Group>(null);
  const [particles, setParticles] = useState<
    Array<{ id: number; pos: THREE.Vector3; vel: THREE.Vector3; color: string; size: number }>
  >([]);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [ringScale, setRingScale] = useState(0);
  const ringRef = useRef<THREE.Mesh>(null);
  const hasTriggered = useRef(false);

  // Trigger effect
  useEffect(() => {
    if (isActive && !hasTriggered.current) {
      hasTriggered.current = true;

      // CLEANUP: Force remove previous instances before adding new ones
      // This fixes the "Doubled Animation" bug
      if (sceneRef.current) {
        sceneRef.current.clear();
      }

      // Create explosion particles
      const newParticles = [];
      const colors = ["#22c55e", "#10b981", "#34d399", "#6ee7b7", "#ffffff", "#fbbf24"];
      const particleCount = prefersReducedMotion() ? 10 : 50;

      for (let i = 0; i < particleCount; i++) {
        const angle = secureMathRandom() * Math.PI * 2; // nosonar:typescript:S2245
        const elevation = (secureMathRandom() - 0.5) * Math.PI; // nosonar:typescript:S2245
        const speed = 2 + secureMathRandom() * 4; // nosonar:typescript:S2245

        newParticles.push({
          id: i,
          pos: new THREE.Vector3(0, 0, 0),
          vel: new THREE.Vector3(
            Math.cos(angle) * Math.cos(elevation) * speed,
            Math.sin(elevation) * speed,
            Math.sin(angle) * Math.cos(elevation) * speed
          ),
          color: colors[Math.floor(secureMathRandom() * colors.length)], // nosonar:typescript:S2245
          size: 0.5 + secureMathRandom() * 0.5, // nosonar:typescript:S2245
        });
      }

      setParticles(newParticles);
      setFlashOpacity(1);
      setRingScale(0.1);

      // Haptic feedback (mobile)
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // Cleanup after animation
      setTimeout(() => {
        hasTriggered.current = false;
        setParticles([]);
        onComplete?.();
      }, 2000);
    }

    // CRITICAL: Do NOT add any fallback mesh code here.
    // If particles fail to load, show nothing rather than a green wireframe.

    const scene = sceneRef.current;
    return () => {
      // Strict cleanup on unmount
      if (scene) {
        scene.clear();
      }
    };
  }, [isActive, onComplete]);

  // Animate flash and ring
  useFrame((_, delta) => {
    if (flashOpacity > 0) {
      setFlashOpacity((prev) => Math.max(0, prev - delta * 4));
    }
    if (ringScale > 0 && ringScale < 5) {
      setRingScale((prev) => prev + delta * 8);
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(ringScale);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0, 1 - ringScale / 5);
    }
  });

  if (!isActive && particles.length === 0) return null;

  return (
    <group ref={sceneRef}>
      {/* Flash sphere */}
      {flashOpacity > 0 && (
        <mesh> {/* NOSONAR */}
          <sphereGeometry args={[10, 32, 32]} /> {/* NOSONAR */}
          <meshBasicMaterial // NOSONAR
            color="#ffffff"
            transparent // NOSONAR
            opacity={flashOpacity * 0.8}
            side={THREE.BackSide} // NOSONAR
          />
        </mesh>
      )}

      {/* Expanding ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}> {/* NOSONAR */}
        <ringGeometry args={[0.8, 1, 64]} /> {/* NOSONAR */}
        <meshBasicMaterial // NOSONAR
          color="#22c55e"
          transparent // NOSONAR
          opacity={1}
          side={THREE.DoubleSide} // NOSONAR
        />
      </mesh>

      {/* Particles */}
      {particles.map((p) => (
        <Particle
          key={p.id}
          initialPosition={p.pos}
          velocity={p.vel}
          color={p.color}
          size={p.size}
        />
      ))}

      {/* Central glow */}
      <pointLight // NOSONAR
        position={[0, 0, 0]} // NOSONAR
        color="#22c55e"
        intensity={flashOpacity * 10} // NOSONAR
        distance={15} // NOSONAR
      />
    </group>
  );
}
