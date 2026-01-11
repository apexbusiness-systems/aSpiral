/**
 * @fileoverview Grease application animation component
 * @module components/3d/GreaseApplication
 * @sonarqube cognitive-complexity: 8
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GreaseType } from './gears/types'

/** Animation phase states */
type GreasePhase = 'idle' | 'dripping' | 'applying' | 'result'

/** Component props */
export interface GreaseApplicationProps {
  /** Type of grease being applied */
  readonly type: GreaseType
  /** Whether animation is active */
  readonly isActive: boolean
  /** Callback when animation completes */
  readonly onComplete: () => void
}

/** Animation constants */
const ANIMATION = Object.freeze({
  dripSpeed: 2,
  evaporateSpeed: 2,
  spreadSpeed: 0.5,
  targetY: 0.5,
  maxScale: 2
} as const)

/** Visual constants */
const COLORS = Object.freeze({
  right: '#10b981',  // Success green
  wrong: '#9ca3af'   // Neutral gray
} as const)

/**
 * Grease application animation component.
 * Visualizes solution testing with viscous fluid simulation.
 *
 * - Wrong grease: drips then evaporates (doesn't stick)
 * - Right grease: drips and spreads (solution found)
 */
export function GreaseApplication({
  type,
  isActive,
  onComplete
}: GreaseApplicationProps): JSX.Element | null {
  const greaseRef = useRef<THREE.Mesh>(null)
  const [phase, setPhase] = useState<GreasePhase>('idle')
  const [opacity, setOpacity] = useState(1)
  const completedRef = useRef(false)
  const { invalidate } = useThree()

  // Reset animation state when activation changes
  useEffect(() => {
    if (isActive && type !== null) {
      setPhase('dripping')
      setOpacity(1)
      completedRef.current = false

      if (greaseRef.current) {
        greaseRef.current.position.set(0, 4, 0)
        greaseRef.current.scale.set(1, 1, 1)
      }
    } else {
      setPhase('idle')
    }
  }, [isActive, type])

  // Completion handler (fires once)
  const triggerComplete = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true
      onComplete()
    }
  }, [onComplete])

  // Animation frame handler
  useFrame((_, delta) => {
    const grease = greaseRef.current
    if (!grease || phase === 'idle' || phase === 'result') return

    if (phase === 'dripping') {
      grease.position.y -= delta * ANIMATION.dripSpeed

      if (grease.position.y < ANIMATION.targetY) {
        setPhase('applying')
      }
      invalidate()
      return
    }

    if (phase === 'applying') {
      if (type === 'wrong') {
        // Wrong grease evaporates
        const newOpacity = Math.max(0, opacity - delta * ANIMATION.evaporateSpeed)
        setOpacity(newOpacity)

        if (newOpacity <= 0) {
          setPhase('result')
          triggerComplete()
        }
      } else if (type === 'right') {
        // Right grease spreads
        grease.scale.x += delta * ANIMATION.spreadSpeed
        grease.scale.z += delta * ANIMATION.spreadSpeed

        if (grease.scale.x > ANIMATION.maxScale) {
          setPhase('result')
          triggerComplete()
        }
      }
      invalidate()
    }
  })

  // Don't render if inactive
  if (!isActive || type === null || phase === 'idle') {
    return null
  }

  const color = type === 'right' ? COLORS.right : COLORS.wrong

  return (
    <mesh ref={greaseRef}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.1}
        metalness={0.2}
      />
    </mesh>
  )
}
