/**
 * Visual Variety Engine
 * Ensures each spiral looks UNIQUE based on content
 */

import type { Entity, Session } from "./types";

export interface SceneConfig {
  camera: {
    position: [number, number, number];
    fov: number;
  };
  background: {
    gradientStart: string;
    gradientMid: string;
    gradientEnd: string;
    auroraIntensity: number;
  };
  lighting: {
    ambient: number;
    directional: number;
    color: string;
  };
  particles: {
    density: number;
    speed: number;
    color: string;
  };
  layout: {
    spread: number;
    clustering: number;
  };
}

type SessionStage = "spiral" | "processing" | "aspiration";

/**
 * Generate scene configuration based on session state
 */
export function generateSceneConfig(
  entities: Entity[],
  stage: SessionStage
): SceneConfig {
  const entityCount = entities.length;
  const avgValence = calculateAverageValence(entities);

  return {
    camera: {
      position: getCameraPosition(entityCount),
      fov: entityCount < 5 ? 60 : 75,
    },
    background: getBackgroundGradient(stage, avgValence),
    lighting: {
      ambient: avgValence < 0 ? 0.3 : 0.5,
      directional: avgValence < 0 ? 0.5 : 0.7,
      color: avgValence < 0 ? "#8b5cf6" : "#3b82f6",
    },
    particles: {
      density: Math.abs(avgValence) * 100,
      speed: avgValence < -0.5 ? 2 : 1,
      color: avgValence < 0 ? "#ec4899" : "#8b5cf6",
    },
    layout: {
      spread: entityCount > 10 ? 5 : 3,
      clustering: stage === "aspiration" ? 0.8 : 0.3,
    },
  };
}

function getCameraPosition(entityCount: number): [number, number, number] {
  const distance = 5 + entityCount * 0.3;
  return [distance, distance * 0.6, distance * 0.8];
}

function getBackgroundGradient(
  stage: SessionStage,
  valence: number
): SceneConfig["background"] {
  if (stage === "aspiration") {
    return {
      gradientStart: "#0c1821",
      gradientMid: "#1e3a5f",
      gradientEnd: "#2d5f7f",
      auroraIntensity: 0.8,
    };
  } else if (valence < -0.5) {
    return {
      gradientStart: "#1a0b2e",
      gradientMid: "#2d1b4e",
      gradientEnd: "#4a2c6d",
      auroraIntensity: Math.abs(valence),
    };
  } else {
    return {
      gradientStart: "#1e1b4b",
      gradientMid: "#312e81",
      gradientEnd: "#4338ca",
      auroraIntensity: 0.5,
    };
  }
}

function calculateAverageValence(entities: Entity[]): number {
  const withValence = entities.filter((e) => e.metadata?.valence !== undefined);
  if (withValence.length === 0) return 0;
  const sum = withValence.reduce((acc, e) => acc + (e.metadata?.valence || 0), 0);
  return sum / withValence.length;
}

/**
 * Calculate intelligent position based on emotional context
 */
export function calculateEntityPosition(
  hint: string,
  valence: number,
  index: number,
  total: number
): [number, number, number] {
  const basePositions: Record<string, [number, number, number]> = {
    upper_right: [2, 2, 0],
    upper_left: [-2, 2, 0],
    lower_right: [2, -2, 0],
    lower_left: [-2, -2, 0],
    center: [0, 0, 0],
  };

  const base = basePositions[hint] || basePositions.center;

  // Spread entities in a spiral pattern
  const angle = (index / total) * Math.PI * 2;
  const radius = 1.5 + index * 0.3;
  const spiralOffset: [number, number, number] = [
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * 0.5,
    Math.sin(angle) * 0.5,
  ];

  // Add jitter based on valence
  const jitter = Math.abs(valence) * 0.3;
  const randomOffset: [number, number, number] = [
    (Math.random() - 0.5) * jitter,
    (Math.random() - 0.5) * jitter,
    (Math.random() - 0.5) * jitter,
  ];

  return [
    base[0] * 0.3 + spiralOffset[0] + randomOffset[0],
    base[1] * 0.3 + spiralOffset[1] + randomOffset[1],
    base[2] + spiralOffset[2] + randomOffset[2],
  ];
}

/**
 * Get color by emotional valence
 */
export function getColorByValence(valence: number, type: string): string {
  if (valence < -0.5) {
    return type === "problem" ? "#ef4444" : "#a855f7";
  } else if (valence > 0.5) {
    return type === "grease" || type === "action" ? "#10b981" : "#3b82f6";
  } else {
    return type === "value" ? "#eab308" : "#6b7280";
  }
}

/**
 * Get entity visual config based on type and role
 */
export function getEntityVisualConfig(
  type: string,
  role?: string
): {
  geometry: "sphere" | "cube" | "octahedron" | "torus" | "cone";
  glow: boolean;
  pulse: boolean;
  wireframe: boolean;
} {
  const configs: Record<string, ReturnType<typeof getEntityVisualConfig>> = {
    problem: { geometry: "cube", glow: true, pulse: false, wireframe: false },
    emotion: { geometry: "octahedron", glow: true, pulse: true, wireframe: false },
    value: { geometry: "cone", glow: true, pulse: false, wireframe: false },
    action: { geometry: "torus", glow: true, pulse: false, wireframe: false },
    friction: { geometry: "cube", glow: true, pulse: true, wireframe: true },
    grease: { geometry: "sphere", glow: true, pulse: false, wireframe: false },
  };

  return configs[type] || { geometry: "sphere", glow: false, pulse: false, wireframe: false };
}

/**
 * Get connection color by type
 */
export function getConnectionColor(type: string): string {
  const colors: Record<string, string> = {
    causes: "#ef4444",
    opposes: "#dc2626",
    blocks: "#f97316",
    enables: "#10b981",
    resolves: "#22c55e",
    requires: "#3b82f6",
    related: "#6b7280",
  };
  return colors[type] || colors.related;
}
