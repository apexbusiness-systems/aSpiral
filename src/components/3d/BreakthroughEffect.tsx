import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useMobileDetect, throttleMobileFrame } from "@/hooks/useMobileDetect";
import * as THREE from "three";

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
  readonly initialPosition: THREE.Vector3;
  readonly color: string;
  readonly velocity: THREE.Vector3;
  readonly size: number;
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
    <mesh ref={ref} position={initialPosition}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={1} />
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
  const isMobile = useMobileDetect();

  // Trigger effect
  useEffect(() => {
    const currentScene = sceneRef.current;
    if (isActive && !hasTriggered.current) {
      hasTriggered.current = true;

      // CLEANUP: Force remove previous instances before adding new ones
      // This fixes the "Doubled Animation" bug
      if (sceneRef.current) {
        while (sceneRef.current.children.length > 0) {
          sceneRef.current.remove(sceneRef.current.children[0]);
        }
      }

      // Create explosion particles
      const newParticles = [];
      const colors = ["#22c55e", "#10b981", "#34d399", "#6ee7b7", "#ffffff", "#fbbf24"];

      // Audit Fix: Scale down particles on mobile for performance
      const particleCount = isMobile ? 20 : 50;

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2; // nosonar:typescript:S2245
        const elevation = (Math.random() - 0.5) * Math.PI; // nosonar:typescript:S2245
        const speed = 2 + Math.random() * (isMobile ? 2 : 4); // nosonar:typescript:S2245

        newParticles.push({
          id: i,
          pos: new THREE.Vector3(0, 0, 0),
          vel: new THREE.Vector3(
            Math.cos(angle) * Math.cos(elevation) * speed,
            Math.sin(elevation) * speed,
            Math.sin(angle) * Math.cos(elevation) * speed
          ),
          color: colors[Math.floor(Math.random() * colors.length)], // nosonar:typescript:S2245
          size: 0.5 + Math.random() * 0.5, // nosonar:typescript:S2245
        });
      }

      setParticles(newParticles);
      setFlashOpacity(1);
      setRingScale(0.1);

      // Haptic feedback (mobile)
      if (typeof globalThis.window !== 'undefined' && navigator.vibrate) {
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

    return () => {
      // Strict cleanup on unmount
      if (currentScene) {
        currentScene.clear();
      }
    };
  }, [isActive, onComplete, isMobile]);

  // Animate flash and ring
  useFrame((state, delta) => {
    if (throttleMobileFrame(isMobile, state.clock.elapsedTime)) return;

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
        <mesh>
          <sphereGeometry args={[10, isMobile ? 16 : 32, isMobile ? 16 : 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={flashOpacity * 0.8}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Expanding ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, isMobile ? 32 : 64]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={1}
          side={THREE.DoubleSide}
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
      {!isMobile && (
        <pointLight
          position={[0, 0, 0]}
          color="#22c55e"
          intensity={flashOpacity * 10}
          distance={15}
        />
      )}
    </group>
  );
}
