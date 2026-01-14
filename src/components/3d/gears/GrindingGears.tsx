/**
 * @fileoverview Premium grinding gears friction visualization
 * @module components/3d/gears/GrindingGears
 * @sonarqube cognitive-complexity: 12
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useCssThemeColors } from '@/lib/three/useCssThemeColors'
import { getTopGearGeometry, getBottomGearGeometry, disposeGearGeometries } from './geometry'
import type { GrindingGearsProps } from './types'

/** Animation constants */
const ANIMATION = Object.freeze({
    grindingSpeed: 0.5,
    smoothSpeed: 2,
    idleSpeed: 0.1,
    gearRatio: 1.5,        // 60:40 teeth
    shakeFrequency: 50,
    shakeAmplitude: 0.02,
    sparkRotationSpeed: 3
} as const)

/** Visual constants */
const COLORS = Object.freeze({
    grinding: '#ef4444',
    resolved: '#10b981',
    spark: '#ff6b35',
    heat: '#ef4444'
} as const)

/** Spark particle configuration */
const SPARK_COUNT = 100

/**
 * Creates spark particle positions buffer.
 * Optimized for minimal memory allocation.
 */
function createSparkPositions(): Float32Array {
    const positions = new Float32Array(SPARK_COUNT * 3)

    for (let i = 0; i < SPARK_COUNT; i++) {
        const idx = i * 3
        positions[idx] = (Math.random() - 0.5) * 0.5 // nosonar:typescript:S2245
        positions[idx + 1] = (Math.random() - 0.5) * 0.5 // nosonar:typescript:S2245
        positions[idx + 2] = (Math.random() - 0.5) * 0.5 // nosonar:typescript:S2245
    }

    return positions
}

/**
 * Premium grinding gears visualization component.
 * Renders mechanical friction metaphor with Apple-level polish.
 * 
 * Features:
 * - Physically accurate gear rotation (counter-rotating, proper ratio)
 * - Dynamic color states (grinding/resolved/idle)
 * - Particle spark effects during friction
 * - Subtle shake animation for tactile feedback
 * - Radial heat glow with pulsing animation
 */
export function GrindingGears({
    friction,
    opposingForce,
    isGrinding,
    greaseApplied,
    greaseType,
    visible = true
}: GrindingGearsProps): JSX.Element | null {
    const topGearRef = useRef<THREE.Mesh>(null)
    const bottomGearRef = useRef<THREE.Mesh>(null)
    const sparksRef = useRef<THREE.Points>(null)
    const heatGlowRef = useRef<THREE.Mesh>(null)

    const { colors } = useCssThemeColors()
    const { invalidate } = useThree()

    // Memoized geometries (singleton pattern)
    const topGearGeometry = useMemo(() => getTopGearGeometry(), [])
    const bottomGearGeometry = useMemo(() => getBottomGearGeometry(), [])

    // Spark positions (created once)
    const sparkPositions = useMemo(() => createSparkPositions(), [])

    // Derive gear color from state
    const gearColor = useMemo(() => {
        if (greaseApplied && greaseType === 'right') {
            return new THREE.Color(COLORS.resolved)
        }
        if (isGrinding) {
            return new THREE.Color(COLORS.grinding)
        }
        return colors.primary.clone()
    }, [isGrinding, greaseApplied, greaseType, colors.primary])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disposeGearGeometries()
        }
    }, [])

    // Animation frame handler
    useFrame((state, delta) => {
        if (!visible) return

        const topGear = topGearRef.current
        const bottomGear = bottomGearRef.current

        if (!topGear || !bottomGear) return

        // Calculate rotation speed based on state
        let speed: number = ANIMATION.idleSpeed
        if (isGrinding) {
            speed = ANIMATION.grindingSpeed
        } else if (greaseApplied && greaseType === 'right') {
            speed = ANIMATION.smoothSpeed
        }

        // Counter-rotating gears with proper ratio
        topGear.rotation.z += delta * speed
        bottomGear.rotation.z -= delta * speed * ANIMATION.gearRatio

        // Shake effect during grinding
        if (isGrinding) {
            const shake = Math.sin(state.clock.elapsedTime * ANIMATION.shakeFrequency) * ANIMATION.shakeAmplitude
            topGear.position.x = shake
            bottomGear.position.x = -shake
        } else {
            topGear.position.x = 0
            bottomGear.position.x = 0
        }

        // Spark rotation
        if (sparksRef.current && isGrinding) {
            sparksRef.current.rotation.z += delta * ANIMATION.sparkRotationSpeed
        }

        // Heat glow pulse
        if (heatGlowRef.current && isGrinding) {
            const material = heatGlowRef.current.material as THREE.MeshBasicMaterial
            material.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 4) * 0.1
        }

        invalidate()
    })

    if (!visible) return null

    return (
        <group>
            {/* TOP GEAR (60 teeth) */}
            <mesh
                ref={topGearRef}
                position={[0, 1.8, 0]}
                geometry={topGearGeometry}
            >
                <meshStandardMaterial
                    color={gearColor}
                    metalness={0.85}
                    roughness={0.25}
                />
            </mesh>

            <Text
                position={[0, 1.8, 0.5]}
                fontSize={0.25}
                color="white"
                anchorX="center"
                anchorY="middle"
                maxWidth={4}
                font="/fonts/sf-pro-display-medium.woff2"
            >
                {friction}
            </Text>

            {/* BOTTOM GEAR (40 teeth) */}
            <mesh
                ref={bottomGearRef}
                position={[0, -1.2, 0]}
                geometry={bottomGearGeometry}
            >
                <meshStandardMaterial
                    color={gearColor}
                    metalness={0.85}
                    roughness={0.25}
                />
            </mesh>

            <Text
                position={[0, -1.2, 0.5]}
                fontSize={0.2}
                color="white"
                anchorX="center"
                anchorY="middle"
                maxWidth={3}
                font="/fonts/sf-pro-display-medium.woff2"
            >
                {opposingForce}
            </Text>

            {/* SPARK PARTICLES (grinding only) */}
            {isGrinding && (
                <points ref={sparksRef} position={[0, 0.3, 0]}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={SPARK_COUNT}
                            array={sparkPositions}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <pointsMaterial
                        size={0.05}
                        color={COLORS.spark}
                        transparent
                        opacity={0.8}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </points>
            )}

            {/* HEAT GLOW (grinding only) */}
            {isGrinding && (
                <mesh ref={heatGlowRef} position={[0, 0.3, -0.5]}>
                    <circleGeometry args={[3, 32]} />
                    <meshBasicMaterial
                        color={COLORS.heat}
                        transparent
                        opacity={0.3}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            )}
        </group>
    )
}
