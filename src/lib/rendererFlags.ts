import { featureFlags } from '@/lib/featureFlags';

export const RENDERER_V2_FLAG = "RENDERER_V2_ENABLED";
export const RENDERER_V2_WORKER_FLAG = "RENDERER_V2_WORKER";

function parseEnvFlag(value: unknown): boolean | null {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

export function isRendererV2Enabled(): boolean {
  if (!featureFlags.rendererV2Enabled) return false;

  if (typeof import.meta !== "undefined") {
    const envValue = parseEnvFlag((import.meta as { env?: Record<string, unknown> }).env?.VITE_RENDERER_V2);
    if (envValue !== null) return envValue;
  }

  if (typeof localStorage !== "undefined") {
    const localValue = parseEnvFlag(localStorage.getItem(RENDERER_V2_FLAG));
    if (localValue !== null) return localValue;
  }

  return true;
}

export function isRendererWorkerEnabled(): boolean {
  if (typeof import.meta !== "undefined") {
    const envValue = parseEnvFlag((import.meta as { env?: Record<string, unknown> }).env?.VITE_RENDERER_V2_WORKER);
    if (envValue !== null) return envValue;
  }

  if (typeof localStorage !== "undefined") {
    const localValue = parseEnvFlag(localStorage.getItem(RENDERER_V2_WORKER_FLAG));
    if (localValue !== null) return localValue;
  }

  return import.meta.env.DEV;
}

export function setRendererV2Enabled(enabled: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(RENDERER_V2_FLAG, enabled ? "true" : "false");
  }
}

export function setRendererWorkerEnabled(enabled: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(RENDERER_V2_WORKER_FLAG, enabled ? "true" : "false");
  }
}
