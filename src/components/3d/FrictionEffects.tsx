import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { GrindingGears } from "./gears";
import { GreaseApplication } from "./GreaseApplication";
import { BreakthroughTransformation } from "./BreakthroughTransformation";
import { useSessionStore } from "@/stores/sessionStore";
import { useSoundEffects } from "@/hooks/useSoundEffects";

export function FrictionEffects() {
  const {
    frictionLabel,
    opposingForce,
    isGrinding,
    greaseApplied,
    greaseType,
    isCinematicPlaying,
    cinematicType,
    resetBreakthrough,
    setGrinding,
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
    if (isGrinding && !wasGrindingRef.current) {
      startGrinding(0.7); // Default intensity
    } else if (!isGrinding && wasGrindingRef.current) {
      stopGrinding();
    }

    wasGrindingRef.current = isGrinding;
    invalidate();
  }, [isGrinding, startGrinding, stopGrinding, invalidate]);

  // Handle grease sound
  useEffect(() => {
    const isApplying = greaseApplied && !wasApplyingGreaseRef.current; // Simple trigger
    if (isApplying) {
      // Play drip sounds staggered
      for (let i = 0; i < 5; i++) {
        setTimeout(() => playGreaseDrip(greaseType === 'right'), i * 150);
      }
    }
    wasApplyingGreaseRef.current = greaseApplied;
    invalidate();
  }, [greaseApplied, greaseType, playGreaseDrip, invalidate]);

  // Handle breakthrough sound
  useEffect(() => {
    if (isCinematicPlaying && !wasBreakthroughRef.current) {
      playBreakthrough();
    }
    wasBreakthroughRef.current = isCinematicPlaying;
    invalidate();
  }, [isCinematicPlaying, playBreakthrough, invalidate]);

  const handleGreaseComplete = () => {
    playGreaseLand(greaseType === 'right');
    // Logic for transition handled by store actions typically,
    // but visual completion might trigger next step if needed.
    invalidate();
  };

  const handleBreakthroughComplete = () => {
    resetBreakthrough();
  };

  // Only render if we have data
  if (!frictionLabel || !opposingForce) return null;

  return (
    <>
      {/* Grinding Gears */}
      <GrindingGears
        friction={frictionLabel}
        opposingForce={opposingForce}
        isGrinding={isGrinding}
        greaseApplied={greaseApplied}
        greaseType={greaseType}
        visible={true}
      />

      {/* Grease Effect */}
      <GreaseApplication
        type={greaseType}
        isActive={greaseApplied}
        onComplete={handleGreaseComplete}
      />

      {/* Breakthrough Transformation */}
      <BreakthroughTransformation
        isTriggered={isCinematicPlaying}
        cinematicType={cinematicType}
        onComplete={handleBreakthroughComplete}
      />
    </>
  );
}
