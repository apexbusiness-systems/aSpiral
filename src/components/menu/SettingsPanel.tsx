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

import { useState, useEffect, useCallback } from "react";
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
  const [settings, setSettings] = useState<SettingsState>(
    externalSettings || defaultSettings
  );
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

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
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      onSettingsChange?.(newSettings);
      return newSettings;
    });
  }, [onSettingsChange]);

  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings);
    onSettingsChange?.(defaultSettings);
  }, [onSettingsChange]);

  // Sync with external settings
  useEffect(() => {
    if (externalSettings) {
      setSettings(externalSettings);
    }
  }, [externalSettings]);

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
                    description="Skip questions and go straight to breakthrough"
                  >
                    <Switch
                      checked={settings.ultraFastMode}
                      onCheckedChange={(v) => updateSetting("ultraFastMode", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Max Questions"
                    description="Number of clarifying questions before breakthrough"
                  >
                    <Select
                      value={settings.maxQuestions.toString()}
                      onValueChange={(v) => updateSetting("maxQuestions", parseInt(v))}
                      disabled={settings.ultraFastMode}
                    >
                      <SelectTrigger className="w-20 touch-manipulation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-popover border-border"
                        style={{ zIndex: CONTENT_Z + 10 }}
                      >
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>

                  <SettingRow
                    label="Auto-Breakthrough"
                    description="Automatically trigger breakthrough when ready"
                  >
                    <Switch
                      checked={settings.autoBreakthrough}
                      onCheckedChange={(v) => updateSetting("autoBreakthrough", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Frustration Detection"
                    description="Detect frustration and skip to breakthrough"
                  >
                    <Switch
                      checked={settings.frustrationDetection}
                      onCheckedChange={(v) => updateSetting("frustrationDetection", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Verbose Responses"
                    description="Get more detailed AI explanations"
                  >
                    <Switch
                      checked={settings.verboseResponses}
                      onCheckedChange={(v) => updateSetting("verboseResponses", v)}
                      className="touch-manipulation"
                    />
                  </SettingRow>

                  <SettingRow
                    label="Sound Effects"
                    description="Play sounds for actions and breakthrough"
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
              className="flex items-center justify-between p-6 border-t border-border/50"
              style={{ 
                flexShrink: 0,
                // Respect safe area at bottom for iPhone home indicator
                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                className="text-muted-foreground hover:text-foreground touch-manipulation"
              >
                <RotateCcw size={16} className="mr-2" />
                Reset to Defaults
              </Button>
              <Button 
                onClick={onClose}
                className="touch-manipulation"
              >
                Done
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Portal to body to escape all stacking contexts
  if (!portalContainer) {
    return null;
  }

  return createPortal(modalContent, portalContainer);
}

// Helper component for setting rows
interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0">
      <div className="flex-1 min-w-0">
        <Label className="text-foreground font-medium">{label}</Label>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div 
        className="flex items-center gap-2 flex-shrink-0"
        style={{ pointerEvents: 'auto' }} // Ensure controls receive touch
      >
        {children}
      </div>
    </div>
  );
}
