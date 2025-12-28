import { useState } from "react";
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

export function SettingsPanel({
  isOpen,
  onClose,
  settings: externalSettings,
  onSettingsChange,
}: SettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsState>(
    externalSettings || defaultSettings
  );

  const updateSetting = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    onSettingsChange?.(defaultSettings);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[1000] bg-background/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={cn(
              "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001]",
              "w-[90%] max-w-xl max-h-[85vh]",
              "flex flex-col",
              "bg-card/95 backdrop-blur-xl",
              "border border-border/50 rounded-2xl",
              "shadow-2xl overflow-hidden"
            )}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Settings
              </h2>
              <button
                className={cn(
                  "w-10 h-10 flex items-center justify-center",
                  "bg-transparent rounded-lg",
                  "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  "transition-colors cursor-pointer"
                )}
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <Tabs defaultValue="voice" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="voice" className="flex items-center gap-2">
                    <Volume2 size={16} />
                    <span className="hidden sm:inline">Voice</span>
                  </TabsTrigger>
                  <TabsTrigger value="visual" className="flex items-center gap-2">
                    <Eye size={16} />
                    <span className="hidden sm:inline">Visual</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="flex items-center gap-2">
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
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                    />
                  </SettingRow>

                  <SettingRow
                    label="Reduced Motion"
                    description="Minimize animations for accessibility"
                  >
                    <Switch
                      checked={settings.reducedMotion}
                      onCheckedChange={(v) => updateSetting("reducedMotion", v)}
                    />
                  </SettingRow>

                  <SettingRow
                    label="3D Visualization"
                    description="Show the interactive 3D entity scene"
                  >
                    <Switch
                      checked={settings.show3DScene}
                      onCheckedChange={(v) => updateSetting("show3DScene", v)}
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
                    />
                  </SettingRow>

                  <SettingRow
                    label="Glow Effects"
                    description="Enable glowing UI elements"
                  >
                    <Switch
                      checked={settings.glowEffects}
                      onCheckedChange={(v) => updateSetting("glowEffects", v)}
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
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                    />
                  </SettingRow>

                  <SettingRow
                    label="Frustration Detection"
                    description="Detect frustration and skip to breakthrough"
                  >
                    <Switch
                      checked={settings.frustrationDetection}
                      onCheckedChange={(v) => updateSetting("frustrationDetection", v)}
                    />
                  </SettingRow>

                  <SettingRow
                    label="Verbose Responses"
                    description="Get more detailed AI explanations"
                  >
                    <Switch
                      checked={settings.verboseResponses}
                      onCheckedChange={(v) => updateSetting("verboseResponses", v)}
                    />
                  </SettingRow>

                  <SettingRow
                    label="Sound Effects"
                    description="Play sounds for actions and breakthrough"
                  >
                    <Switch
                      checked={settings.soundEffects}
                      onCheckedChange={(v) => updateSetting("soundEffects", v)}
                    />
                  </SettingRow>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw size={16} className="mr-2" />
                Reset to Defaults
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
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
      <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
    </div>
  );
}
