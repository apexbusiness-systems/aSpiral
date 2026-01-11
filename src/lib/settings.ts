export interface SettingsState {
  // Voice settings
  voiceEnabled: boolean;
  voiceVolume: number;
  speechRate: number;
  voiceType: string;
  autoListen: boolean;

  // Visual settings
  theme: "dark" | "light" | "system";
  animationsEnabled: boolean;
  reducedMotion: boolean;
  show3DScene: boolean;
  particleEffects: boolean;
  glowEffects: boolean;

  // AI behavior
  ultraFastMode: boolean;
  maxQuestions: number;
  autoBreakthrough: boolean;
  frustrationDetection: boolean;
  verboseResponses: boolean;
  soundEffects: boolean;
}

export const defaultSettings: SettingsState = {
  voiceEnabled: true,
  voiceVolume: 80,
  speechRate: 1.0,
  voiceType: "natural",
  autoListen: false,

  theme: "dark",
  animationsEnabled: true,
  reducedMotion: false,
  show3DScene: true,
  particleEffects: true,
  glowEffects: true,

  ultraFastMode: false,
  maxQuestions: 2,
  autoBreakthrough: true,
  frustrationDetection: true,
  verboseResponses: false,
  soundEffects: true,
};

export const SETTINGS_STORAGE_KEY = "aspiral_settings_v1";

const isSettingsState = (value: unknown): value is SettingsState => {
  if (!value || typeof value !== "object") return false;
  const v = value as SettingsState;
  return (
    typeof v.voiceEnabled === "boolean" &&
    typeof v.voiceVolume === "number" &&
    typeof v.speechRate === "number" &&
    typeof v.voiceType === "string" &&
    typeof v.autoListen === "boolean" &&
    (v.theme === "dark" || v.theme === "light" || v.theme === "system") &&
    typeof v.animationsEnabled === "boolean" &&
    typeof v.reducedMotion === "boolean" &&
    typeof v.show3DScene === "boolean" &&
    typeof v.particleEffects === "boolean" &&
    typeof v.glowEffects === "boolean" &&
    typeof v.ultraFastMode === "boolean" &&
    typeof v.maxQuestions === "number" &&
    typeof v.autoBreakthrough === "boolean" &&
    typeof v.frustrationDetection === "boolean" &&
    typeof v.verboseResponses === "boolean" &&
    typeof v.soundEffects === "boolean"
  );
};

export const loadStoredSettings = (): SettingsState | null => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as unknown;
    return isSettingsState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveStoredSettings = (settings: SettingsState): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures (e.g. private mode)
  }
};
