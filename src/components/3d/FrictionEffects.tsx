import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { GrindingGears } from "./GrindingGears";
import { GreaseEffect } from "./GreaseEffect";
import { BreakthroughEffect } from "./BreakthroughEffect";
import { useSessionStore } from "@/stores/sessionStore";
import { useSoundEffects } from "@/hooks/useSoundEffects";

export function FrictionEffects() {
  const {
    activeFriction,
    isApplyingGrease,
    greaseIsCorrect,
    isBreakthroughActive,
    clearBreakthrough,
    hideFriction,
  } = useSessionStore();
  const invalidate = useThree((state) => state.invalidate);

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
    invalidate();
  }, [activeFriction, isApplyingGrease, startGrinding, stopGrinding, invalidate]);

  // Handle grease sound
  useEffect(() => {
    if (isApplyingGrease && !wasApplyingGreaseRef.current) {
      // Play drip sounds staggered
      for (let i = 0; i < 5; i++) {
        setTimeout(() => playGreaseDrip(greaseIsCorrect), i * 150);
      }
    }
    wasApplyingGreaseRef.current = isApplyingGrease;
    invalidate();
  }, [isApplyingGrease, greaseIsCorrect, playGreaseDrip, invalidate]);

  // Handle breakthrough sound
  useEffect(() => {
    if (isBreakthroughActive && !wasBreakthroughRef.current) {
      playBreakthrough();
    }
    wasBreakthroughRef.current = isBreakthroughActive;
    invalidate();
  }, [isBreakthroughActive, playBreakthrough, invalidate]);

  const handleGreaseComplete = () => {
    playGreaseLand(greaseIsCorrect);
    if (greaseIsCorrect) {
      hideFriction();
    }
    invalidate();
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
