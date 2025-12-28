import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface GrindingGearsProps {
  topLabel: string;
  bottomLabel: string;
  intensity?: number; // 0-1, how hard they're grinding
  isActive: boolean;
  position?: [number, number, number];
}

// Create gear geometry
function createGearShape(innerRadius: number, outerRadius: number, teeth: number) {
  const shape = new THREE.Shape();
  const toothDepth = (outerRadius - innerRadius) * 0.3;
  const toothWidth = (Math.PI * 2) / teeth / 2;

  for (let i = 0; i < teeth; i++) {
    const angle = (i / teeth) * Math.PI * 2;
    const nextAngle = ((i + 1) / teeth) * Math.PI * 2;

    // Inner arc
    if (i === 0) {
      shape.moveTo(
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius
      );
    }

    // Tooth rise
    shape.lineTo(
      Math.cos(angle + toothWidth * 0.2) * innerRadius,
      Math.sin(angle + toothWidth * 0.2) * innerRadius
    );
    shape.lineTo(
      Math.cos(angle + toothWidth * 0.3) * outerRadius,
      Math.sin(angle + toothWidth * 0.3) * outerRadius
    );

    // Tooth top
    shape.lineTo(
      Math.cos(angle + toothWidth * 0.7) * outerRadius,
      Math.sin(angle + toothWidth * 0.7) * outerRadius
    );

    // Tooth fall
    shape.lineTo(
      Math.cos(angle + toothWidth * 0.8) * innerRadius,
      Math.sin(angle + toothWidth * 0.8) * innerRadius
    );

    // To next tooth
    shape.lineTo(
      Math.cos(nextAngle) * innerRadius,
      Math.sin(nextAngle) * innerRadius
    );
  }

  return shape;
}

// Spark particle
function Spark({ position, velocity }: { position: THREE.Vector3; velocity: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);
  const life = useRef(1);

  useFrame((_, delta) => {
    if (ref.current && life.current > 0) {
      ref.current.position.add(velocity.clone().multiplyScalar(delta));
      velocity.y -= delta * 5; // gravity
      life.current -= delta * 2;
      ref.current.scale.setScalar(life.current);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = life.current;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color="#ffaa00" transparent opacity={1} />
    </mesh>
  );
}

export function GrindingGears({
  topLabel,
  bottomLabel,
  intensity = 0.7,
  isActive,
  position = [0, 0, 0],
}: GrindingGearsProps) {
  const topGearRef = useRef<THREE.Mesh>(null);
  const bottomGearRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const sparkTime = useRef(0);
  const sparksRef = useRef<Array<{ id: number; pos: THREE.Vector3; vel: THREE.Vector3 }>>([]);

  // Create gear geometry
  const gearGeometry = useMemo(() => {
    const shape = createGearShape(0.3, 0.5, 12);
    const extrudeSettings = {
      steps: 1,
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Heat color based on intensity
  const heatColor = useMemo(() => {
    const r = Math.min(1, 0.5 + intensity * 0.5);
    const g = Math.max(0, 0.3 - intensity * 0.2);
    const b = 0;
    return new THREE.Color(r, g, b);
  }, [intensity]);

  useFrame((state, delta) => {
    if (!isActive) return;

    const speed = 1 + intensity * 2;

    // Counter-rotate gears
    if (topGearRef.current) {
      topGearRef.current.rotation.z += delta * speed;
    }
    if (bottomGearRef.current) {
      bottomGearRef.current.rotation.z -= delta * speed;
    }

    // Shake effect based on intensity
    if (groupRef.current) {
      const shake = intensity * 0.02;
      groupRef.current.position.x = position[0] + (Math.random() - 0.5) * shake;
      groupRef.current.position.y = position[1] + (Math.random() - 0.5) * shake;
    }

    // Generate sparks
    sparkTime.current += delta;
    if (sparkTime.current > 0.1 / intensity && sparksRef.current.length < 20) {
      sparkTime.current = 0;
      const angle = Math.random() * Math.PI * 2;
      const sparkPos = new THREE.Vector3(
        Math.cos(angle) * 0.5,
        0,
        Math.sin(angle) * 0.3
      );
      const sparkVel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 3
      );
      sparksRef.current.push({
        id: Date.now() + Math.random(),
        pos: sparkPos,
        vel: sparkVel,
      });
    }

    // Clean old sparks
    sparksRef.current = sparksRef.current.slice(-15);
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Top Gear */}
      <group position={[0, 0.55, 0]}>
        <mesh ref={topGearRef} geometry={gearGeometry} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color={heatColor}
            emissive={heatColor}
            emissiveIntensity={intensity * 0.8}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <Text
          position={[0, 0.4, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {topLabel}
        </Text>
      </group>

      {/* Bottom Gear */}
      <group position={[0, -0.55, 0]}>
        <mesh ref={bottomGearRef} geometry={gearGeometry} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color={heatColor}
            emissive={heatColor}
            emissiveIntensity={intensity * 0.8}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <Text
          position={[0, -0.4, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {bottomLabel}
        </Text>
      </group>

      {/* Heat glow */}
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={intensity * 0.3}
        />
      </mesh>

      {/* Sparks */}
      {sparksRef.current.map((spark) => (
        <Spark key={spark.id} position={spark.pos} velocity={spark.vel} />
      ))}

      {/* Grinding point glow */}
      <pointLight
        position={[0, 0, 0.5]}
        color="#ff6600"
        intensity={intensity * 2}
        distance={3}
      />
    </group>
  );
}
