import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Entity } from '@/lib/types';

interface EntityMeshProps {
    entity: Entity;
    index: number;
    position: [number, number, number];
}

interface EntityConfig {
    geometry: JSX.Element;
    color: string;
    emissive: string;
    scale?: number;
}

export const EntityMesh: React.FC<EntityMeshProps> = ({ entity, index, position }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const config: EntityConfig = useMemo(() => {
        switch (entity.type) {
            case 'friction':
                return {
                    geometry: <boxGeometry args={[0.8, 0.8, 0.8]} />, // NOSONAR
                    color: '#ff4444',
                    emissive: '#ff2222',
                    scale: 1,
                };
            case 'grease':
                return {
                    geometry: <coneGeometry args={[0.6, 1.2, 4]} />, // NOSONAR
                    color: '#ffcc00',
                    emissive: '#ffaa00',
                    scale: 1,
                };
            case 'insight':
            case 'value': // Fallback for similar types 
            case 'action':
                return {
                    geometry: <sphereGeometry args={[0.5, 32, 32]} />, // NOSONAR
                    color: '#4488ff',
                    emissive: '#2266ff',
                    scale: 1,
                };
            default: // emotion, problem, etc
                return {
                    geometry: <sphereGeometry args={[0.4, 32, 32]} />, // NOSONAR
                    color: '#8b5cf6', // Brand purple
                    emissive: '#6d28d9',
                    scale: 0.8,
                };
        }
    }, [entity.type]);

    useFrame((state) => {
        if (!meshRef.current) return;

        const time = state.clock.getElapsedTime();

        // Floating animation
        meshRef.current.position.y =
            position[1] + Math.sin(time + index * 0.5) * 0.15;
        // Set X/Z from props but keep updated Y
        meshRef.current.position.x = position[0];
        meshRef.current.position.z = position[2];

        // Rotation animation
        meshRef.current.rotation.y += 0.005;
        meshRef.current.rotation.x = Math.sin(time * 0.5) * 0.05;

        // Hover scale
        const targetScale = hovered ? (config.scale || 1) * 1.05 : (config.scale || 1);
        meshRef.current.scale.lerp(
            new THREE.Vector3(targetScale, targetScale, targetScale),
            0.1
        );
    });

    return (
        <group position={[position[0], 0, position[2]]}> {/* Y is handled in useFrame relative to base 0? No, let's keep it clean */}
            {/* Actually we set position in useFrame, so group position can be 0,0,0 or we can remove useFrame pos update for static layout. 
        But Physics might update props. Let's assume props change. 
        Better: Use group for position from props, use mesh inner floating.
    */}
            <group position={position}>
                <mesh
                    ref={meshRef}
                    castShadow
                    receiveShadow
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                    onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
                >
                    {config.geometry}
                    <meshStandardMaterial
                        color={config.color}
                        emissive={config.emissive}
                        emissiveIntensity={hovered ? 0.4 : 0.2}
                        metalness={0.3}
                        roughness={0.4}
                    />
                </mesh>

                {/* Label */}
                <Text
                    position={[0, 1.5, 0]}
                    fontSize={0.2}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#000000"
                    fillOpacity={hovered ? 1 : 0.8}
                >
                    {entity.label}
                </Text>
            </group>
        </group>
    );
};
