import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface BreakthroughEffectProps {
  isActive: boolean;
  onComplete?: () => void;
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
    <mesh ref={ref} position={initialPosition}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={1} />
    </mesh>
  );
}

export function BreakthroughEffect({ isActive, onComplete }: BreakthroughEffectProps) {
  const { scene } = useThree();
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

      // Create explosion particles
      const newParticles = [];
      const colors = ["#22c55e", "#10b981", "#34d399", "#6ee7b7", "#ffffff", "#fbbf24"];
      
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI;
        const speed = 2 + Math.random() * 4;

        newParticles.push({
          id: i,
          pos: new THREE.Vector3(0, 0, 0),
          vel: new THREE.Vector3(
            Math.cos(angle) * Math.cos(elevation) * speed,
            Math.sin(elevation) * speed,
            Math.sin(angle) * Math.cos(elevation) * speed
          ),
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 0.5 + Math.random() * 0.5,
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
    <group>
      {/* Flash sphere */}
      {flashOpacity > 0 && (
        <mesh>
          <sphereGeometry args={[10, 32, 32]} />
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
        <ringGeometry args={[0.8, 1, 64]} />
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
      <pointLight
        position={[0, 0, 0]}
        color="#22c55e"
        intensity={flashOpacity * 10}
        distance={15}
      />
    </group>
  );
}
