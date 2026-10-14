import React from "react";
import type { Entity } from "@/lib/types";
import { BaseEntityOrb } from "./BaseEntityOrb";

interface EntityOrbProps {
  readonly entity: Entity;
  readonly position: [number, number, number];
  readonly onClick?: (entity: Entity) => void;
}

export const EntityOrb = React.memo(function EntityOrb({ entity, position, onClick }: EntityOrbProps) {
  return (
    <BaseEntityOrb
      entity={entity}
      position={position}
      onClick={onClick}
    />
  );
});
