import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { AdaptiveEntity } from "./AdaptiveEntity";
import { ConnectionLine } from "./ConnectionLine";
import { GrindingGears } from "./GrindingGears";
import { GreaseEffect } from "./GreaseEffect";
import { BreakthroughEffect } from "./BreakthroughEffect";
import { useSessionStore } from "@/stores/sessionStore";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { usePhysicsWorker, useFallbackLayout } from "@/hooks/usePhysicsWorker";
import { getVisibleLimit, getStaggerDelay } from "@/lib/entityLimits";
import { detectDeviceCapabilities } from "@/lib/performance/optimizer";
import { useAuth } from "@/contexts/AuthContext";
import type { Entity } from "@/lib/types";
import * as THREE from "three";

type Position3D = [number, number, number];

/**
 * APEX Phase 2: Off-Main-Thread Physics Integration
 * Uses Web Worker for force-directed layout calculations
 */
function SpiralEntities() {
  const currentSession = useSessionStore((state) => state.currentSession);
  const { profile } = useAuth();

  const [visibleEntityIds, setVisibleEntityIds] = useState<Set<string>>(new Set());

  // Position refs for 60FPS updates (bypass React state)
  const positionRefs = useRef<Map<string, THREE.Vector3>>(new Map());
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  const entities = currentSession?.entities || [];
  const connections = currentSession?.connections || [];
  
  // Handle position updates from physics worker
  const handlePositionsUpdate = useCallback((positions: Map<string, Position3D>) => {
    positions.forEach((pos, id) => {
      // Update position ref
      let vec = positionRefs.current.get(id);
      if (!vec) {
        vec = new THREE.Vector3(pos[0], pos[1], pos[2]);
        positionRefs.current.set(id, vec);
      } else {
        vec.set(pos[0], pos[1], pos[2]);
      }
      
      // Directly update mesh position for 60FPS
      const mesh = meshRefs.current.get(id);
      if (mesh) {
        mesh.position.lerp(vec, 0.15); // Smooth interpolation
      }
    });
  }, []);
  
  // Initialize physics worker with optimized config
  const { state: workerState } = usePhysicsWorker(entities, connections, {
    onPositionsUpdate: handlePositionsUpdate,
    autoUpdate: true,
    config: {
      iterations: 25, // Reduced from 50 for better performance
      repulsionStrength: 0.8,
      attractionStrength: 0.05,
      damping: 0.92, // Slightly higher damping = fewer updates needed
    },
  });
  
  // Fallback layout for initial positions or if worker fails
  const fallbackPositions = useFallbackLayout(entities, connections);
  
  // Get current positions (from worker or fallback)
  const getEntityPosition = useCallback((entityId: string): Position3D => {
    // First check position refs (from worker)
    const workerPos = positionRefs.current.get(entityId);
    if (workerPos) {
      return [workerPos.x, workerPos.y, workerPos.z];
    }
    
    // Fall back to sync layout
    const fallback = fallbackPositions.get(entityId);
    if (fallback) {
      return fallback;
    }
    
    // Default position
    return [0, 0, 0];
  }, [fallbackPositions]);
  
  // Progressive disclosure - show entities over time
  useEffect(() => {
    if (entities.length === 0) {
      setVisibleEntityIds(new Set());
      return;
    }
    
    // Sort by importance
    const sorted = [...entities].sort((a, b) =>
      (b.metadata?.importance || 0.5) - (a.metadata?.importance || 0.5)
    );

    const userTier = profile?.tier || "free";
    const visibleLimit = getVisibleLimit(userTier);
    
    // Show initial entities immediately
    const initial = new Set(sorted.slice(0, visibleLimit).map(e => e.id));
    setVisibleEntityIds(initial);
    
    // Stagger remaining entities
    sorted.slice(visibleLimit).forEach((entity, index) => {
      const delay = getStaggerDelay(index + visibleLimit, visibleLimit);
      setTimeout(() => {
        setVisibleEntityIds(prev => new Set([...prev, entity.id]));
      }, delay);
    });
  }, [entities, profile]);

  const handleEntityClick = (entity: Entity) => {
    console.log("Entity clicked:", entity);
  };

  // Register mesh ref for direct physics updates
  const handleMeshRef = useCallback((id: string) => (mesh: THREE.Mesh | null) => {
    if (mesh) {
      meshRefs.current.set(id, mesh);
    } else {
      meshRefs.current.delete(id);
    }
  }, []);

  return (
    <>
      {/* Render entities with adaptive visibility */}
      {entities.map((entity) => {
        const position = getEntityPosition(entity.id);
        const isVisible = visibleEntityIds.has(entity.id);
        const importance = entity.metadata?.importance || 0.5;
        
        return (
          <AdaptiveEntity
            key={entity.id}
            entity={entity}
            position={position}
            isVisible={isVisible}
            onClick={handleEntityClick}
            showLabel={importance > 0.7 ? "important" : "hover"}
            onMeshRef={handleMeshRef(entity.id)}
          />
        );
      })}
      
      {/* Only show connections for visible entities */}
      {connections
        .filter(conn => 
          visibleEntityIds.has(conn.fromEntityId) && 
          visibleEntityIds.has(conn.toEntityId)
        )
        .map((connection) => {
          const fromPos = getEntityPosition(connection.fromEntityId);
          const toPos = getEntityPosition(connection.toEntityId);
          
          return (
            <ConnectionLine
              key={connection.id}
              connection={connection}
              fromPosition={fromPos}
              toPosition={toPos}
            />
          );
        })}
        
      {/* Debug: Show worker state in development */}
      {import.meta.env.DEV && workerState.lastError && (
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}
    </>
  );
}

function FrictionEffects() {
  const { 
    activeFriction, 
    isApplyingGrease, 
    greaseIsCorrect, 
    isBreakthroughActive,
    clearBreakthrough,
    hideFriction,
  } = useSessionStore();

  const {
    startGrinding,
    stopGrinding,
    playGreaseDrip,
    playGreaseLand,
    playBreakthrough,
  } = useSoundEffects({ enabled: true, volume: 0.5 });

  const wasGrindingRef = useRef(false);
  const wasApplyingGreaseRef = useRef(false);
  const wasBreakthroughRef = useRef(false);

  // Handle grinding sound
  useEffect(() => {
    const isGrinding = !!activeFriction && !isApplyingGrease;
    
    if (isGrinding && !wasGrindingRef.current) {
      startGrinding(activeFriction?.intensity || 0.7);
    } else if (!isGrinding && wasGrindingRef.current) {
      stopGrinding();
    }
    
    wasGrindingRef.current = isGrinding;
  }, [activeFriction, isApplyingGrease, startGrinding, stopGrinding]);

  // Handle grease sound
  useEffect(() => {
    if (isApplyingGrease && !wasApplyingGreaseRef.current) {
      // Play drip sounds staggered
      for (let i = 0; i < 5; i++) {
        setTimeout(() => playGreaseDrip(greaseIsCorrect), i * 150);
      }
    }
    wasApplyingGreaseRef.current = isApplyingGrease;
  }, [isApplyingGrease, greaseIsCorrect, playGreaseDrip]);

  // Handle breakthrough sound
  useEffect(() => {
    if (isBreakthroughActive && !wasBreakthroughRef.current) {
      playBreakthrough();
    }
    wasBreakthroughRef.current = isBreakthroughActive;
  }, [isBreakthroughActive, playBreakthrough]);

  const handleGreaseComplete = () => {
    playGreaseLand(greaseIsCorrect);
    if (greaseIsCorrect) {
      hideFriction();
    }
  };

  return (
    <>
      {/* Grinding Gears */}
      <GrindingGears
        topLabel={activeFriction?.topLabel || ""}
        bottomLabel={activeFriction?.bottomLabel || ""}
        intensity={activeFriction?.intensity || 0.7}
        isActive={!!activeFriction && !isApplyingGrease}
        position={[0, 1, 0]}
      />

      {/* Grease Effect */}
      <GreaseEffect
        isActive={isApplyingGrease}
        isCorrect={greaseIsCorrect}
        position={[0, 1, 0]}
        onComplete={handleGreaseComplete}
      />

      {/* Breakthrough Explosion */}
      <BreakthroughEffect
        isActive={isBreakthroughActive}
        onComplete={clearBreakthrough}
      />
    </>
  );
}

function SceneContent() {
  // Adaptive star count based on device capabilities
  const starCount = useMemo(() => {
    const capabilities = detectDeviceCapabilities();

    // Low-end devices: minimal stars
    if (capabilities.deviceType === 'mobile' || capabilities.gpuTier === 1) {
      return 300;
    }

    // Mid-range: moderate stars
    if (capabilities.deviceType === 'tablet' || capabilities.gpuTier === 2) {
      return 500;
    }

    // High-end: full stars
    return 800;
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />

      {/* Environment - adaptive count for performance */}
      <Stars
        radius={80}
        depth={40}
        count={starCount}
        factor={3}
        saturation={0}
        fade
        speed={0.2}
      />
      
      {/* Spiral center indicator - simplified geometry */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 8, 48]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Ground plane hint - simplified */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ringGeometry args={[0.5, 5, 32]} />
        <meshBasicMaterial
          color="#1e1b4b"
          transparent
          opacity={0.2}
          side={2}
        />
      </mesh>
      
      {/* Entities */}
      <SpiralEntities />
      
      {/* Friction & Breakthrough Effects */}
      <FrictionEffects />
      
      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export function SpiralScene() {
  return (
    <div className="h-full w-full gpu-accelerated">
      <Canvas
        camera={{ position: [5, 3, 5], fov: 60 }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]} // Limit pixel ratio for performance
        performance={{ min: 0.5 }} // Allow quality reduction
        frameloop="demand" // Only render when needed
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
