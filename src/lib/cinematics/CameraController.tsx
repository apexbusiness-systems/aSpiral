import { secureMathRandom } from '@/lib/secureMathRandom';
/**
 * Camera Controller for ASPIRAL Cinematics
 * Handles smooth camera animations with easing
 */

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CameraPath, CameraControllerRef } from './types';
import type { EasingFunction } from './easing';
import { easeInOutCubic, getEasingFunction } from './easing';

interface CameraControllerProps {
  /** Camera path configuration */
  path: CameraPath;
  /** Total duration (ms) */
  duration: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Enable camera shake */
  enableShake?: boolean;
  /** Camera shake intensity */
  shakeIntensity?: number;
  /** Auto-start animation */
  autoStart?: boolean;
}

export const CameraController = forwardRef<CameraControllerRef, CameraControllerProps>(
  (
    {
      path,
      duration,
      onComplete,
      enableShake = false,
      shakeIntensity = 0.1,
      autoStart = true,
    },
    ref
  ) => {
    const { camera } = useThree();
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const startTime = useRef<number | null>(null);
    const isPlaying = useRef(autoStart);
    const isPaused = useRef(false);
    const pausedElapsed = useRef(0);
    const lookAtTarget = useRef<THREE.Vector3 | null>(null);
    const initialFov = useRef(perspectiveCamera.fov ?? 60);

    // Parse easing function
    const easingFn = useRef<EasingFunction>(
      typeof path.easing === 'string' ? getEasingFunction(path.easing) : path.easing || easeInOutCubic
    );

    // Reusable objects to prevent memory allocation on every frame
    const startPos = useRef(new THREE.Vector3());
    const endPos = useRef(new THREE.Vector3());
    const currentPos = useRef(new THREE.Vector3());
    const shakeVec = useRef(new THREE.Vector3());
    const startRot = useRef(new THREE.Euler());
    const endRot = useRef(new THREE.Euler());
    const startQuat = useRef(new THREE.Quaternion());
    const endQuat = useRef(new THREE.Quaternion());
    const currentQuat = useRef(new THREE.Quaternion());

    // Setup look-at target
    useEffect(() => {
      if (path.lookAt === 'center') {
        lookAtTarget.current = new THREE.Vector3(0, 0, 0);
      } else if (path.lookAt) {
        lookAtTarget.current = new THREE.Vector3(path.lookAt.x, path.lookAt.y, path.lookAt.z);
      }

      // Store initial FOV
      if ('fov' in camera) {
        initialFov.current = (camera as THREE.PerspectiveCamera).fov;
      }
    }, [path.lookAt, camera]);

    // Expose control methods via ref
    useImperativeHandle(ref, () => ({
      skip: () => {
        // Jump to end
        if (!startTime.current) return;
        const targetPos = new THREE.Vector3(path.to.x, path.to.y, path.to.z);
        camera.position.copy(targetPos);

        if (path.fov && 'fov' in camera) {
          (camera as THREE.PerspectiveCamera).fov = path.fov.to;
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }

        if (lookAtTarget.current) {
          camera.lookAt(lookAtTarget.current);
        }

        isPlaying.current = false;
        onComplete?.();
      },
      pause: () => {
        if (isPlaying.current && startTime.current) {
          isPaused.current = true;
          pausedElapsed.current = performance.now() - startTime.current;
        }
      },
      resume: () => {
        if (isPaused.current && startTime.current) {
          isPaused.current = false;
          startTime.current = performance.now() - pausedElapsed.current;
        }
      },
      reset: () => {
        startTime.current = null;
        isPlaying.current = false;
        isPaused.current = false;
        pausedElapsed.current = 0;

        // Reset to start position
        const startPos = new THREE.Vector3(path.from.x, path.from.y, path.from.z);
        camera.position.copy(startPos);

        if (path.fov && 'fov' in camera) {
          (camera as THREE.PerspectiveCamera).fov = path.fov.from;
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }
      },
      getProgress: () => {
        if (!startTime.current) return 0;
        const elapsed = isPaused.current ? pausedElapsed.current : performance.now() - startTime.current;
        return Math.min(elapsed / duration, 1);
      },
    }));

    // Animation loop
    useFrame(() => {
      if (!isPlaying.current || isPaused.current) return;

      // Initialize start time
      if (!startTime.current) {
        startTime.current = performance.now();
      }

      const elapsed = performance.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Apply easing
      const t = easingFn.current(progress);

      // Interpolate position using reusable objects
      startPos.current.set(path.from.x, path.from.y, path.from.z);
      endPos.current.set(path.to.x, path.to.y, path.to.z);
      currentPos.current.lerpVectors(startPos.current, endPos.current, t);

      // Apply camera shake if enabled
      if (enableShake && progress < 0.9) {
        const shakeX = (secureMathRandom() - 0.5) * shakeIntensity;
        const shakeY = (secureMathRandom() - 0.5) * shakeIntensity;
        const shakeZ = (secureMathRandom() - 0.5) * shakeIntensity;
        shakeVec.current.set(shakeX, shakeY, shakeZ);
        currentPos.current.add(shakeVec.current);
      }

      camera.position.copy(currentPos.current);

      // Interpolate rotation if specified using reusable objects
      if (path.rotation) {
        startRot.current.set(0, 0, 0, path.rotation.order || 'XYZ');
        endRot.current.set(
          path.rotation.x,
          path.rotation.y,
          path.rotation.z,
          path.rotation.order || 'XYZ'
        );

        startQuat.current.setFromEuler(startRot.current);
        endQuat.current.setFromEuler(endRot.current);
        currentQuat.current.slerpQuaternions(startQuat.current, endQuat.current, t);

        camera.quaternion.copy(currentQuat.current);
      }

      // Interpolate FOV if specified
      if (path.fov && 'fov' in camera) {
        (camera as THREE.PerspectiveCamera).fov = path.fov.from + (path.fov.to - path.fov.from) * t;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }

      // Look at target
      if (lookAtTarget.current && !path.rotation) {
        camera.lookAt(lookAtTarget.current);
      }

      // Check if animation complete
      if (progress >= 1) {
        isPlaying.current = false;
        onComplete?.();
      }
    });

    return null;
  }
);

CameraController.displayName = 'CameraController';
