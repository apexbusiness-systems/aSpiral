const parseBooleanFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
};

const defaultEnabled = true;

const voiceEnabled = parseBooleanFlag(import.meta.env.VITE_VOICE_ENABLED, defaultEnabled);
const cinematicsEnabled = parseBooleanFlag(import.meta.env.VITE_CINEMATICS_ENABLED, defaultEnabled);
const rendererV2Enabled = parseBooleanFlag(import.meta.env.VITE_RENDERER_V2_ENABLED, defaultEnabled);
const breakthroughQualityV2 = parseBooleanFlag(import.meta.env.VITE_BREAKTHROUGH_QUALITY_V2, defaultEnabled);

export const featureFlags = Object.freeze({
  voiceEnabled,
  cinematicsEnabled,
  rendererV2Enabled,
  breakthroughQualityV2,
});

export type FeatureFlags = typeof featureFlags;
