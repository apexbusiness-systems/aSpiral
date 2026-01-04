/**
 * SettingsPanel Component
 * 
 * ROOT CAUSE FIX (iOS Safari/WebView stacking context issue):
 * The original implementation used framer-motion divs rendered inline, which
 * could be trapped under ancestors with CSS transforms, filters, or backdrop-filters.
 * On iOS, this causes the modal to appear blurred/obfuscated and touch events
 * to be intercepted by parent layers.
 * 
 * SOLUTION:
 * 1. Portal to document.body - escapes all stacking contexts
 * 2. Extreme z-index (2147483000+) - safe ceiling for modal layer
 * 3. Safe area padding - respects iOS notch/home indicator
 * 4. Explicit pointer-events - ensures touch events reach controls
 * 5. -webkit-overflow-scrolling: touch - smooth scroll on iOS
 * 6. Fixed positioning with translate - standard modal centering
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Eye, Brain, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUpdateGuard } from "@/lib/updateGuard";
import { addBreadcrumb } from "@/lib/debugOverlay";
import { useRenderStormDetector } from "@/hooks/useRenderStormDetector";

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

const defaultSettings: SettingsState = {
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

const SETTINGS_STORAGE_KEY = "aspiral_settings_v1";

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

const areSettingsEqual = (a: SettingsState, b: SettingsState) =>
  a.voiceEnabled === b.voiceEnabled &&
  a.voiceVolume === b.voiceVolume &&
  a.speechRate === b.speechRate &&
  a.voiceType === b.voiceType &&
  a.autoListen === b.autoListen &&
  a.theme === b.theme &&
  a.animationsEnabled === b.animationsEnabled &&
  a.reducedMotion === b.reducedMotion &&
  a.show3DScene === b.show3DScene &&
  a.particleEffects === b.particleEffects &&
  a.glowEffects === b.glowEffects &&
  a.ultraFastMode === b.ultraFastMode &&
  a.maxQuestions === b.maxQuestions &&
  a.autoBreakthrough === b.autoBreakthrough &&
  a.frustrationDetection === b.frustrationDetection &&
  a.verboseResponses === b.verboseResponses &&
  a.soundEffects === b.soundEffects;

const loadStoredSettings = (): SettingsState | null => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as unknown;
    return isSettingsState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: SettingsState;
  onSettingsChange?: (settings: SettingsState) => void;
}

/**
 * Z-index contract for modal layers:
 * - OVERLAY_Z: 2147483000 (near max safe int, above all app content)
 * - CONTENT_Z: OVERLAY_Z + 1 (ensures content is above overlay)
 */
const OVERLAY_Z = 2147483000;
const CONTENT_Z = OVERLAY_Z + 1;

export function SettingsPanel({
  isOpen,
  onClose,
  settings: externalSettings,
  onSettingsChange,
}: SettingsPanelProps) {
  useRenderStormDetector('SettingsPanel');

  const [settings, setSettings] = useState<SettingsState>(() => {
    if (externalSettings) return externalSettings;
    const stored = loadStoredSettings();
    return stored ?? defaultSettings;
  });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const settingsUpdateGuard = useMemo(
    () => createUpdateGuard({ name: "SettingsPanel.setSettings" }),
    []
  );
  const lastSavedRef = useRef<string | null>(null);

  // Create/get portal container on mount
  useEffect(() => {
    let container = document.getElementById('settings-panel-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'settings-panel-portal';
      // Ensure portal container itself doesn't create stacking context issues
      container.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 2147483000; pointer-events: none;';
      document.body.appendChild(container);
    }
    setPortalContainer(container);
    
    return () => {
      // Don't remove on unmount - reuse for performance
    };
  }, []);

  // Track open/close for debugging
  useEffect(() => {
    if (isOpen) {
      addBreadcrumb({ type: 'settings', message: 'open' });
    } else {
      addBreadcrumb({ type: 'settings', message: 'close' });
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const updateSetting = useCallback(<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    settingsUpdateGuard();
    setSettings(prev => {
      if (prev[key] === value) {
        return prev;
      }
      const newSettings = { ...prev, [key]: value };
      onSettingsChange?.(newSettings);
      return newSettings;
    });
  }, [onSettingsChange, settingsUpdateGuard]);

  const resetToDefaults = useCallback(() => {
    settingsUpdateGuard();
    setSettings(prev => {
      if (areSettingsEqual(prev, defaultSettings)) {
        return prev;
      }
      onSettingsChange?.(defaultSettings);
      return defaultSettings;
    });
  }, [onSettingsChange, settingsUpdateGuard]);

  // Sync with external settings
  useEffect(() => {
    if (externalSettings && !areSettingsEqual(externalSettings, settings)) {
      settingsUpdateGuard();
      setSettings(externalSettings);
    }
  }, [externalSettings, settings, settingsUpdateGuard]);

  // Persist settings locally (idempotent)
  useEffect(() => {
    try {
      const serialized = JSON.stringify(settings);
      if (lastSavedRef.current !== serialized) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, serialized);
        lastSavedRef.current = serialized;
      }
    } catch {
      // Ignore storage failures (e.g. private mode)
    }
  }, [settings]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - highest z-index, receives click to close */}
          <motion.div
            role="presentation"
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: OVERLAY_Z,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              pointerEvents: 'auto',
              // Safe area: ensure backdrop extends behind notch
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          />

          {/* Panel Content - above backdrop, centered, scrollable */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-panel-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click-through
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: CONTENT_Z,
              width: '90%',
              maxWidth: '32rem', // max-w-xl
              // Max height with safe area respect
              maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 48px)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'hsl(var(--card) / 0.98)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid hsl(var(--border) / 0.5)',
              borderRadius: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              pointerEvents: 'auto',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-6 border-b border-border/50"
              style={{ flexShrink: 0 }}
            >
              <h2 
                id="settings-panel-title"
                className="font-display text-2xl font-bold text-foreground"
              >
                Settings
              </h2>
              <button
                type="button"
                aria-label="Close settings"
                className={cn(
                  "w-10 h-10 flex items-center justify-center",
                  "bg-transparent rounded-lg",
                  "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  "transition-colors cursor-pointer",
                  "touch-manipulation" // Improves touch responsiveness on iOS
                )}
                onClick={onClose}
                style={{ pointerEvents: 'auto' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div 
              className="flex-1 overflow-y-auto p-6"
              style={{
                WebkitOverflowScrolling: 'touch', // Smooth scroll on iOS
                overscrollBehavior: 'contain', // Prevent scroll chaining
              }}
            >
              <Tabs defaultValue="voice" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger 
                    value="voice" 
                    className="flex items-center gap-2 touch-manipulation"
                  >
                    <Volume2 size={16} />
                    <span className="hidden sm:inline">Voice</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="visual" 
                    className="flex items-center gap-2 touch-manipulation"
                  >
                    <Eye size={16} />
                    <span className="hidden sm:inline">Visual</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ai" 
                    className="flex items-center gap-2 touch-manipulation"
                  >
                    <Brain size={16} />
                    <span className="hidden sm:inline">AI</span>
                  </TabsTrigger>
                </TabsList>

                {/* Voice Settings */}
                <TabsContent value="voice" className="space-y-6">
                  <SettingRow
                    label="Voice Input"
                    description="Enable microphone input for voice conversations"
                  >
                    <Switch
                      checked={settings.voiceEnabled}
                      onCheckedChange={(v) => updateSetting("voiceEnabled", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Volume"
                    description="Adjust the volume of AI voice responses"
                  >
                    <div className="w-32">
                      <Slider
                        value={[settings.voiceVolume]}
                        onValueChange={([v]) => updateSetting("voiceVolume", v)}
                        max={100}
                        step={5}
                        disabled={!settings.voiceEnabled}
                        className="touch-manipulation"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-10 text-right">
                      {settings.voiceVolume}%
                    </span>
                  </SettingRow>

                  <SettingRow
                    label="Speech Rate"
                    description="Speed of AI voice responses"
                  >
                    <div className="w-32">
                      <Slider
                        value={[settings.speechRate]}
                        onValueChange={([v]) => updateSetting("speechRate", v)}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        disabled={!settings.voiceEnabled}
                        className="touch-manipulation"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-10 text-right">
                      {settings.speechRate.toFixed(1)}x
                    </span>
                  </SettingRow>

                  <SettingRow
                    label="Voice Type"
                    description="Choose the AI assistant's voice"
                  >
                    <Select
                      value={settings.voiceType}
                      onValueChange={(v) => updateSetting("voiceType", v)}
                      disabled={!settings.voiceEnabled}
                    >
                      <SelectTrigger className="w-32 touch-manipulation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-popover border-border"
                        style={{ zIndex: CONTENT_Z + 10 }} // Above modal content
                      >
                        <SelectItem value="natural">Natural</SelectItem>
                        <SelectItem value="calm">Calm</SelectItem>
                        <SelectItem value="energetic">Energetic</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>

                  <SettingRow
                    label="Auto-Listen"
                    description="Automatically start listening after AI responds"
                  >
                    <Switch
                      checked={settings.autoListen}
                      onCheckedChange={(v) => updateSetting("autoListen", v)}
                      disabled={!settings.voiceEnabled}
                      className="touch-manipulation"
                    />
                  </SettingRow>
                </TabsContent>

                {/* Visual Settings */}
                <TabsContent value="visual" className="space-y-6">
                  <SettingRow
                    label="Theme"
                    description="Choose your preferred color scheme"
                  >
                    <Select
                      value={settings.theme}
                      onValueChange={(v) => updateSetting("theme", v as SettingsState["theme"])}
                    >
                      <SelectTrigger className="w-32 touch-manipulation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-popover border-border"
                        style={{ zIndex: CONTENT_Z + 10 }}
                      >
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>

                  <SettingRow
                    label="Animations"
                    description="Enable smooth transitions and animations"
                  >
                    <Switch
                      checked={settings.animationsEnabled}
                      onCheckedChange={(v) => updateSetting("animationsEnabled", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Reduced Motion"
                    description="Minimize animations for accessibility"
                  >
                    <Switch
                      checked={settings.reducedMotion}
                      onCheckedChange={(v) => updateSetting("reducedMotion", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="3D Visualization"
                    description="Show the interactive 3D entity scene"
                  >
                    <Switch
                      checked={settings.show3DScene}
                      onCheckedChange={(v) => updateSetting("show3DScene", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Particle Effects"
                    description="Show particle animations during breakthrough"
                  >
                    <Switch
                      checked={settings.particleEffects}
                      onCheckedChange={(v) => updateSetting("particleEffects", v)}
                      disabled={settings.reducedMotion}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Glow Effects"
                    description="Enable glowing UI elements"
                  >
                    <Switch
                      checked={settings.glowEffects}
                      onCheckedChange={(v) => updateSetting("glowEffects", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>
                </TabsContent>

                {/* AI Behavior Settings */}
                <TabsContent value="ai" className="space-y-6">
                  <SettingRow
                    label="Ultra-Fast Mode"
                    description="Skip the questioning and go straight to breakthrough"
                  >
                    <Switch
                      checked={settings.ultraFastMode}
                      onCheckedChange={(v) => updateSetting("ultraFastMode", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Max Questions"
                    description="Number of questions before breakthrough"
                  >
                    <div className="w-32">
                      <Slider
                        value={[settings.maxQuestions]}
                        onValueChange={([v]) => updateSetting("maxQuestions", v)}
                        min={1}
                        max={5}
                        step={1}
                        className="touch-manipulation"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-10 text-right">
                      {settings.maxQuestions}
                    </span>
                  </SettingRow>

                  <SettingRow
                    label="Auto-Breakthrough"
                    description="Automatically trigger breakthrough when patterns are detected"
                  >
                    <Switch
                      checked={settings.autoBreakthrough}
                      onCheckedChange={(v) => updateSetting("autoBreakthrough", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Frustration Detection"
                    description="Detect and respond to user frustration"
                  >
                    <Switch
                      checked={settings.frustrationDetection}
                      onCheckedChange={(v) => updateSetting("frustrationDetection", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Verbose Responses"
                    description="Provide more detailed AI explanations"
                  >
                    <Switch
                      checked={settings.verboseResponses}
                      onCheckedChange={(v) => updateSetting("verboseResponses", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Sound Effects"
                    description="Enable UI sound effects"
                  >
                    <Switch
                      checked={settings.soundEffects}
                      onCheckedChange={(v) => updateSetting("soundEffects", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div
              className="p-6 border-t border-border/50 flex items-center justify-between"
              style={{ flexShrink: 0 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <RotateCcw size={16} />
                Reset
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!portalContainer) return null;

  return createPortal(modalContent, portalContainer);
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}
