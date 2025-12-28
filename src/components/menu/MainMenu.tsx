import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Pause,
  Play,
  Square,
  RotateCcw,
  Zap,
  Save,
  History,
  Download,
  Settings,
  HelpCircle,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmationModal } from "./ConfirmationModal";

interface MainMenuProps {
  isOpen: boolean;
  onClose: () => void;
  sessionState: "idle" | "active" | "paused" | "breakthrough";
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSkipToBreakthrough: () => void;
  onSave: () => void;
  onExport: () => void;
  onViewHistory: () => void;
  onSettings: () => void;
  onHelp: () => void;
  sessionProgress?: {
    questionCount: number;
    entityCount: number;
    timeElapsed: number;
  };
}

export function MainMenu({
  isOpen,
  onClose,
  sessionState,
  onPause,
  onResume,
  onStop,
  onRestart,
  onSkipToBreakthrough,
  onSave,
  onExport,
  onViewHistory,
  onSettings,
  onHelp,
  sessionProgress,
}: MainMenuProps) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const hasActiveSession = sessionState !== "idle";
  const isPaused = sessionState === "paused";
  const isBreakthrough = sessionState === "breakthrough";

  function handleActionWithConfirmation(action: string, handler: () => void) {
    const needsConfirmation = ["stop", "restart"];

    if (needsConfirmation.includes(action) && hasActiveSession) {
      setConfirmAction(action);
    } else {
      handler();
      if (action !== "pause" && action !== "resume") {
        onClose();
      }
    }
  }

  function handleConfirm() {
    switch (confirmAction) {
      case "stop":
        onStop();
        break;
      case "restart":
        onRestart();
        break;
    }
    setConfirmAction(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[998] bg-background/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            className={cn(
              "fixed top-0 right-0 bottom-0 z-[999]",
              "w-[400px] max-w-[90vw]",
              "flex flex-col",
              "bg-card/95 backdrop-blur-xl",
              "border-l border-border/50",
              "shadow-[-20px_0_60px_hsl(var(--background)/0.5)]"
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex flex-col gap-2">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  ASPIRAL
                </h2>
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    "px-3 py-1 rounded-full w-fit",
                    sessionState === "idle" &&
                      "bg-muted/50 text-muted-foreground border border-muted",
                    sessionState === "active" &&
                      "bg-green-500/20 text-green-500 border border-green-500/30",
                    sessionState === "paused" &&
                      "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30",
                    sessionState === "breakthrough" &&
                      "bg-primary/20 text-primary border border-primary/30"
                  )}
                >
                  {sessionState === "idle" && "Ready"}
                  {sessionState === "active" && "In Progress"}
                  {sessionState === "paused" && "Paused"}
                  {sessionState === "breakthrough" && "Breakthrough"}
                </span>
              </div>

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

            {/* Session Progress */}
            {hasActiveSession && sessionProgress && (
              <div className="flex gap-4 p-6 bg-muted/30 border-b border-border/50">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Questions
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {sessionProgress.questionCount}/2
                  </span>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Entities
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {sessionProgress.entityCount}/5
                  </span>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Time
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {Math.floor(sessionProgress.timeElapsed / 60)}m{" "}
                    {sessionProgress.timeElapsed % 60}s
                  </span>
                </div>
              </div>
            )}

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Session Controls */}
              {hasActiveSession && !isBreakthrough && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    Session Controls
                  </h3>
                  <div className="flex flex-col gap-2">
                    <MenuAction
                      icon={isPaused ? Play : Pause}
                      label={isPaused ? "Resume" : "Pause"}
                      shortcut="Space"
                      onClick={() => (isPaused ? onResume() : onPause())}
                    />
                    <MenuAction
                      icon={Zap}
                      label="Skip to Breakthrough"
                      shortcut="B"
                      variant="primary"
                      onClick={() =>
                        handleActionWithConfirmation("skip", onSkipToBreakthrough)
                      }
                    />
                    <MenuAction
                      icon={Save}
                      label="Save Progress"
                      shortcut="Ctrl+S"
                      onClick={() => {
                        onSave();
                        onClose();
                      }}
                    />
                    <MenuAction
                      icon={Square}
                      label="Stop Session"
                      shortcut="Esc"
                      variant="danger"
                      onClick={() => handleActionWithConfirmation("stop", onStop)}
                    />
                    <MenuAction
                      icon={RotateCcw}
                      label="Restart"
                      shortcut="Ctrl+R"
                      variant="danger"
                      onClick={() =>
                        handleActionWithConfirmation("restart", onRestart)
                      }
                    />
                  </div>
                </div>
              )}

              {/* Breakthrough Actions */}
              {isBreakthrough && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    Breakthrough Complete ✨
                  </h3>
                  <div className="flex flex-col gap-2">
                    <MenuAction
                      icon={Download}
                      label="Export Breakthrough"
                      shortcut="E"
                      variant="accent"
                      onClick={() => {
                        onExport();
                        onClose();
                      }}
                    />
                    <MenuAction
                      icon={Save}
                      label="Save & Continue Later"
                      onClick={() => {
                        onSave();
                        onClose();
                      }}
                    />
                    <MenuAction
                      icon={RotateCcw}
                      label="Start New Spiral"
                      onClick={() => {
                        onRestart();
                        onClose();
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Navigation
                </h3>
                <div className="flex flex-col gap-2">
                  <MenuAction
                    icon={History}
                    label="Past Sessions"
                    shortcut="H"
                    onClick={() => {
                      onViewHistory();
                      onClose();
                    }}
                  />
                  {hasActiveSession && (
                    <MenuAction
                      icon={Download}
                      label="Export Current"
                      shortcut="E"
                      onClick={() => {
                        onExport();
                        onClose();
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Settings & Help */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Settings & Help
                </h3>
                <div className="flex flex-col gap-2">
                  <MenuAction
                    icon={Settings}
                    label="Settings"
                    shortcut=","
                    onClick={() => {
                      onSettings();
                      onClose();
                    }}
                  />
                  <MenuAction
                    icon={HelpCircle}
                    label="How it Works"
                    shortcut="?"
                    onClick={() => {
                      onHelp();
                      onClose();
                    }}
                  />
                  <MenuAction
                    icon={Keyboard}
                    label="Keyboard Shortcuts"
                    onClick={() => {}}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">v1.0.0 Beta</p>
              <p className="text-sm italic text-muted-foreground">
                Decision Intelligence
              </p>
            </div>
          </motion.div>

          {/* Confirmation Modal */}
          <AnimatePresence>
            {confirmAction && (
              <ConfirmationModal
                action={confirmAction}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

// Menu Action Button Component
interface MenuActionProps {
  icon: typeof Pause;
  label: string;
  shortcut?: string;
  variant?: "default" | "primary" | "accent" | "danger";
  onClick: () => void;
}

function MenuAction({
  icon: Icon,
  label,
  shortcut,
  variant = "default",
  onClick,
}: MenuActionProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-3 w-full p-4",
        "border rounded-xl",
        "text-left font-medium text-foreground",
        "cursor-pointer transition-all duration-200",
        "hover:translate-x-[-2px]",
        variant === "default" &&
          "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border",
        variant === "primary" &&
          "bg-primary/20 border-primary/40 hover:bg-primary/30 hover:border-primary/60",
        variant === "accent" &&
          "bg-green-500/20 border-green-500/40 hover:bg-green-500/30 hover:border-green-500/60",
        variant === "danger" &&
          "bg-destructive/10 border-destructive/30 hover:bg-destructive/20 hover:border-destructive/50"
      )}
      onClick={onClick}
    >
      <Icon size={20} className="text-muted-foreground flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="px-2 py-1 bg-background/30 border border-border/50 rounded text-xs font-mono text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
