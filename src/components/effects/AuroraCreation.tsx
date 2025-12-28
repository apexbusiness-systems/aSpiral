import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export type EntityType = "person" | "problem" | "idea" | "emotion";

interface AuroraCreationProps {
  id: string;
  position: { x: number; y: number };
  type: EntityType;
  onComplete: (id: string) => void;
}

export function AuroraCreation({ id, position, type, onComplete }: AuroraCreationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete(id);
    }, 1200);

    return () => clearTimeout(timer);
  }, [id, onComplete]);

  if (!isVisible) return null;

  const colorClass = {
    person: "aurora-creation-person",
    problem: "aurora-creation-problem",
    idea: "aurora-creation-idea",
    emotion: "aurora-creation-emotion",
  }[type];

  return (
    <div
      className={cn("aurora-creation", colorClass)}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
}

// Manager component for multiple aurora bursts
interface AuroraManagerProps {
  bursts: Array<{
    id: string;
    position: { x: number; y: number };
    type: EntityType;
  }>;
  onBurstComplete: (id: string) => void;
}

export function AuroraManager({ bursts, onBurstComplete }: AuroraManagerProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      {bursts.map((burst) => (
        <AuroraCreation
          key={burst.id}
          id={burst.id}
          position={burst.position}
          type={burst.type}
          onComplete={onBurstComplete}
        />
      ))}
    </div>
  );
}
