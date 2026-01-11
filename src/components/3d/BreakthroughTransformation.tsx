/**
 * @fileoverview Cinematic breakthrough transformation component
 * @module components/3d/BreakthroughTransformation
 * @sonarqube cognitive-complexity: 10
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CINEMATICS, type CinematicType } from '../../lib/cinematics'

/** Component props */
export interface BreakthroughTransformationProps {
  /** Whether transformation is triggered */
  readonly isTriggered: boolean
  /** Cinematic variant to play */
  readonly cinematicType: CinematicType
  /** Callback when transformation completes */
  readonly onComplete: () => void
}

/**
 * Easing function: cubic ease-out for smooth deceleration.
 * Creates Apple-style fluid animation feel.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Plays audio with graceful failure handling.
 * Audio should enhance, never block.
 */
function playAudioSafely(src: string, volume = 0.5): void {
  try {
    const audio = new Audio(src)
    audio.volume = volume
    audio.play().catch(() => {
      // Audio blocked by browser policy - silent failure
    })
  } catch {
    // Audio not supported - silent failure
  }
}

/**
 * Triggers haptic feedback on supported devices.
 */
function triggerHaptics(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100])
  }
}

/**
 * Cinematic breakthrough transformation component.
 * Orchestrates camera animation, flash effects, audio, and haptics.
 * Apple-level attention to timing and easing creates
 * magical, memorable breakthrough moments.
 */
export function BreakthroughTransformation({
  isTriggered,
  cinematicType,
  onComplete
}: BreakthroughTransformationProps): JSX.Element | null {
  const flashRef = useRef<THREE.Mesh>(null)
  const startTimeRef = useRef<number | null>(null)
  const completedRef = useRef(false)
  const [flashOpacity, setFlashOpacity] = useState(0)

  const { camera, invalidate } = useThree()
  const config = CINEMATICS[cinematicType]

  // Initialize transformation
  useEffect(() => {
    if (!isTriggered) return

    startTimeRef.current = null
    completedRef.current = false

    // Sensory feedback
    playAudioSafely(config.audio)
    triggerHaptics()
  }, [isTriggered, config.audio])

  // Animation frame handler
  useFrame((state) => {
    if (!isTriggered || completedRef.current) return

    // Initialize start time
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime * 1000
    }

    const elapsed = state.clock.elapsedTime * 1000 - (startTimeRef.current || 0)
    const progress = Math.min(elapsed / config.duration, 1)
    const easedProgress = easeOutCubic(progress)

    // Interpolate camera position
    const { from, to } = config.camera
    camera.position.lerpVectors(
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(to.x, to.y, to.z),
      easedProgress
    )

    // Apply rotation if specified
    if (config.camera.rotation) {
      camera.rotation.y = config.camera.rotation.y * easedProgress
    }

    // Flash effect at midpoint (0.45 - 0.55)
    if (progress >= 0.45 && progress <= 0.55) {
      setFlashOpacity(1 - Math.abs(progress - 0.5) * 20)
    } else {
      setFlashOpacity(0)
    }

    // Complete transformation
    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true
      setFlashOpacity(0)
      onComplete()
    }

    invalidate()
  })

  if (!isTriggered) return null

  return (
    <mesh ref={flashRef}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={flashOpacity}
      />
    </mesh>
  )
}
