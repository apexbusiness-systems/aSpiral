import { useMemo, Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { SemanticEntity } from "./SemanticEntity";
import { ConnectionLine } from "./ConnectionLine";
import { GrindingGears } from "./GrindingGears";
import { GreaseEffect } from "./GreaseEffect";
import { BreakthroughEffect } from "./BreakthroughEffect";
import { useSessionStore } from "@/stores/sessionStore";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { calculateEntityPosition, getConnectionColor } from "@/lib/visualVariety";
import type { Entity } from "@/lib/types";

function SpiralEntities() {
  const currentSession = useSessionStore((state) => state.currentSession);
  
  const entities = currentSession?.entities || [];
  const connections = currentSession?.connections || [];
  
  // Calculate intelligent positions based on emotional valence and importance
  const entityPositions = useMemo(() => {
    const positions = new Map<string, [number, number, number]>();
    const total = entities.length;
    
    entities.forEach((entity, index) => {
      const valence = entity.metadata?.valence || 0;
      const hint = entity.metadata?.positionHint || "center";
      
      // Use intelligent positioning based on emotional context
      const position = calculateEntityPosition(hint, valence, index, total);
      positions.set(entity.id, position);
    });
    
    return positions;
  }, [entities]);

  const handleEntityClick = (entity: Entity) => {
    console.log("Entity clicked:", entity);
  };

  return (
    <>
      {/* Render entities with semantic visualization */}
      {entities.map((entity) => {
        const position = entityPositions.get(entity.id);
        if (!position) return null;
        
        return (
          <SemanticEntity
            key={entity.id}
            entity={entity}
            position={position}
            onClick={handleEntityClick}
          />
        );
      })}
      
      {/* Render connections */}
      {connections.map((connection) => {
        const fromPos = entityPositions.get(connection.fromEntityId);
        const toPos = entityPositions.get(connection.toEntityId);
        
        if (!fromPos || !toPos) return null;
        
        return (
          <ConnectionLine
            key={connection.id}
            connection={connection}
            fromPosition={fromPos}
            toPosition={toPos}
          />
        );
      })}
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
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      
      {/* Environment */}
      <Stars
        radius={100}
        depth={50}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
      
      {/* Spiral center indicator */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 16, 100]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Ground plane hint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ringGeometry args={[0.5, 5, 64]} />
        <meshBasicMaterial
          color="#1e1b4b"
          transparent
          opacity={0.3}
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
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [5, 3, 5], fov: 60 }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
