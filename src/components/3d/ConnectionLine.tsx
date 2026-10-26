import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Connection } from "@/lib/types";

interface ConnectionLineProps {
  connection: Connection;
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
}

const connectionColors: Record<string, string> = {
  causes: "#ef4444",
  blocks: "#f97316", 
  enables: "#22c55e",
  resolves: "#3b82f6",
};

export function ConnectionLine({
  connection,
  fromPosition,
  toPosition,
}: ConnectionLineProps) {
  const color = connectionColors[connection.type] || "#888888";
  
  const points = useMemo(() => {
    const start = new THREE.Vector3(...fromPosition);
    const end = new THREE.Vector3(...toPosition);
    
    // Create a curved path between points
    const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
    midPoint.y += 0.5; // Arc upward
    
    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
    return curve.getPoints(32);
  }, [fromPosition, toPosition]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={connection.strength}
    />
  );
}
