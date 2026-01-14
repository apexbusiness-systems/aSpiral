import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface GreaseEffectProps {
  isActive: boolean;
  isCorrect: boolean; // true = sticks (green), false = evaporates
  position?: [number, number, number];
  onComplete?: () => void;
}

// Individual grease droplet
function GreaseDroplet({
  startY,
  targetY,
  sticks,
  delay,
  onLand,
}: {
  startY: number;
  targetY: number;
  sticks: boolean;
  delay: number;
  onLand: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [phase, setPhase] = useState<"waiting" | "falling" | "landed" | "evaporating" | "done">("waiting");
  const startTime = useRef(0);
  const landTime = useRef(0);

  useFrame((state) => {
    if (!ref.current) return;

    const time = state.clock.elapsedTime;

    if (phase === "waiting") {
      if (startTime.current === 0) startTime.current = time;
      if (time - startTime.current > delay) {
        setPhase("falling");
      }
      return;
    }

    if (phase === "falling") {
      const fallSpeed = 2;
      ref.current.position.y -= fallSpeed * 0.016;

      // Stretch while falling
      ref.current.scale.y = 1.5;
      ref.current.scale.x = 0.7;
      ref.current.scale.z = 0.7;

      if (ref.current.position.y <= targetY) {
        ref.current.position.y = targetY;
        landTime.current = time;
        setPhase("landed");
        onLand();
      }
    }

    if (phase === "landed") {
      // Splat effect
      const landDuration = time - landTime.current;
      if (landDuration < 0.2) {
        ref.current.scale.y = 0.3;
        ref.current.scale.x = 1 + landDuration * 3;
        ref.current.scale.z = 1 + landDuration * 3;
      } else if (!sticks) {
        setPhase("evaporating");
      }
    }

    if (phase === "evaporating") {
      // Rise and fade
      ref.current.position.y += 0.02;
      ref.current.scale.multiplyScalar(0.95);
      const material = ref.current.material as THREE.MeshStandardMaterial;
      material.opacity *= 0.95;

      if (material.opacity < 0.05) {
        setPhase("done");
      }
    }
  });

  if (phase === "done") return null;

  const color = sticks ? "#22c55e" : "#888888";

  return (
    <mesh ref={ref} position={[0, startY, 0]}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={sticks ? 0.4 : 0.1}
        transparent
        opacity={0.9}
        roughness={0.1}
        metalness={0.3}
      />
    </mesh>
  );
}

export function GreaseEffect({
  isActive,
  isCorrect,
  position = [0, 0, 0],
  onComplete,
}: GreaseEffectProps) {
  const [drops, setDrops] = useState<number[]>([]);
  const [landedCount, setLandedCount] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  // Start dropping when active
  useEffect(() => {
    if (isActive) {
      setDrops([0, 1, 2, 3, 4]);
      setLandedCount(0);
    } else {
      setDrops([]);
    }
  }, [isActive]);

  // Trigger completion when all drops land
  useEffect(() => {
    if (landedCount >= 5 && isActive) {
      setTimeout(() => {
        onComplete?.();
      }, isCorrect ? 500 : 1000);
    }
  }, [landedCount, isActive, isCorrect, onComplete]);

  const handleLand = () => {
    setLandedCount((prev) => prev + 1);
  };

  if (!isActive && drops.length === 0) return null;

  return (
    <group ref={groupRef} position={position}>
      {drops.map((i) => (
        <GreaseDroplet
          key={i}
          startY={2}
          targetY={0}
          sticks={isCorrect}
          delay={i * 0.15}
          onLand={handleLand}
        />
      ))}

      {/* Pooling effect for correct grease */}
      {isCorrect && landedCount >= 3 && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3 + landedCount * 0.05, 32]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.3}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </group>
  );
}
