/**
 * @fileoverview Premium Aurora platform stage component
 * @module components/3d/aurora/AuroraPlatform
 * @sonarqube cognitive-complexity: 6
 */

import { useMemo, useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useCssThemeColors } from '@/lib/three/useCssThemeColors'
import { createGlowTexture, disposeTextures } from './textures'
import { getOptimalParticleCount } from './deviceTier'

/** Component props */
export interface AuroraPlatformProps {
    /** Override particle count (otherwise device-adaptive) */
    readonly particleCount?: number
    /** Enable sparkle particle field */
    readonly enableSparkles?: boolean
}

/** Platform geometry constants */
const GEOMETRY = Object.freeze({
    platformRadius: 6,
    hazeRadius: 8,
    innerRingOuter: 4,
    innerRingInner: 3.8,
    outerRingOuter: 6,
    outerRingInner: 5.8,
    segments: 64
} as const)

/**
 * Creates sparkle particle positions array.
 * Distributed in cylindrical volume above platform.
 */
function createSparklePositions(count: number): Float32Array {
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2 // nosonar:typescript:S2245
        const radius = Math.random() * 4 + 1 // nosonar:typescript:S2245
        const idx = i * 3

        positions[idx] = Math.cos(theta) * radius
        positions[idx + 1] = Math.random() * 2 + 0.5 // nosonar:typescript:S2245
        positions[idx + 2] = Math.sin(theta) * radius
    }

    return positions
}

/**
 * Premium Aurora platform stage component.
 * Creates ambient, brand-aligned visual foundation.
 * 
 * Design principles:
 * - Subtle, not distracting (platform serves content)
 * - Brand-color synchronized via CSS custom properties
 * - Device-adaptive particle density
 * - Additive blending for ethereal glow effect
 */
export function AuroraPlatform({
    particleCount,
    enableSparkles = true
}: AuroraPlatformProps): JSX.Element {
    const { colors, version } = useCssThemeColors()
    const { invalidate } = useThree()

    // Material refs for direct color updates
    const platformMatRef = useRef<THREE.MeshStandardMaterial>(null)
    const hazeMatRef = useRef<THREE.MeshBasicMaterial>(null)
    const ring1MatRef = useRef<THREE.MeshBasicMaterial>(null)
    const ring2MatRef = useRef<THREE.MeshBasicMaterial>(null)
    const sparkleMatRef = useRef<THREE.PointsMaterial>(null)

    // Device-adaptive particle count
    const sparkleCount = useMemo(
        () => getOptimalParticleCount(particleCount),
        [particleCount]
    )

    // Glow texture (created once)
    const glowTexture = useMemo(() => createGlowTexture(), [])

    // Sparkle positions (created once)
    const sparklePositions = useMemo(
        () => createSparklePositions(sparkleCount),
        [sparkleCount]
    )

    // Update materials when theme changes
    useEffect(() => {
        platformMatRef.current?.color.copy(colors.primary)
        hazeMatRef.current?.color.copy(colors.spiralGlow)
        ring1MatRef.current?.color.copy(colors.spiralAccent)
        ring2MatRef.current?.color.copy(colors.secondary)
        sparkleMatRef.current?.color.copy(colors.spiralGlow)

        invalidate()
    }, [colors, version, invalidate])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disposeTextures()
        }
    }, [])

    return (
        <group position={[0, -2, 0]}>
            {/* Platform disk (subtle base) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[GEOMETRY.platformRadius, GEOMETRY.segments]} />
                <meshStandardMaterial
                    ref={platformMatRef}
                    color={colors.primary}
                    transparent
                    opacity={0.12}
                    metalness={0.5}
                    roughness={0.8}
                />
            </mesh>

            {/* Glow haze (ethereal bloom) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[GEOMETRY.hazeRadius, GEOMETRY.segments]} />
                <meshBasicMaterial
                    ref={hazeMatRef}
                    color={colors.spiralGlow}
                    transparent
                    opacity={0.18}
                    alphaMap={glowTexture}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Inner ring (accent) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[
                    GEOMETRY.innerRingInner,
                    GEOMETRY.innerRingOuter,
                    GEOMETRY.segments
                ]} />
                <meshBasicMaterial
                    ref={ring1MatRef}
                    color={colors.spiralAccent}
                    transparent
                    opacity={0.35}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Outer ring (secondary) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[
                    GEOMETRY.outerRingInner,
                    GEOMETRY.outerRingOuter,
                    GEOMETRY.segments
                ]} />
                <meshBasicMaterial
                    ref={ring2MatRef}
                    color={colors.secondary}
                    transparent
                    opacity={0.22}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Sparkle field */}
            {enableSparkles && (
                <points>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={sparkleCount}
                            array={sparklePositions}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <pointsMaterial
                        ref={sparkleMatRef}
                        size={0.04}
                        color={colors.spiralGlow}
                        transparent
                        opacity={0.55}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                        sizeAttenuation
                    />
                </points>
            )}
        </group>
    )
}
