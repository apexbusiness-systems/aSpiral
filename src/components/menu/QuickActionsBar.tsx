import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, Square, Zap, Save, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickActionsBarProps {
  sessionState: "idle" | "active" | "paused" | "breakthrough";
  questionCount?: number;
  maxQuestions?: number;
  timeElapsed?: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkip: () => void;
  onSave: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function QuickActionsBar({
  sessionState,
  questionCount = 0,
  maxQuestions = 2,
  timeElapsed = 0,
  onPause,
  onResume,
  onStop,
  onSkip,
  onSave,
}: QuickActionsBarProps) {
  const isPaused = sessionState === "paused";
  const hasActiveSession = sessionState === "active" || sessionState === "paused";
  const isBreakthrough = sessionState === "breakthrough";

  return (
    <AnimatePresence>
      {(hasActiveSession || isBreakthrough) && (
        <motion.header
          className={cn(
            "fixed top-0 left-0 right-0 z-[98]",
            "flex items-center justify-between sm:justify-center gap-2 sm:gap-6 px-3 sm:px-6 py-2 sm:py-3",
            // Solid background on mobile for contrast, glass on desktop
            "bg-card sm:bg-background/60 sm:backdrop-blur-xl",
            "border-b border-border/50"
          )}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Session Info - Left */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Timer */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-foreground sm:text-muted-foreground text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="font-mono">{formatTime(timeElapsed)}</span>
            </div>
            
            {/* Progress Indicator - hidden on very small screens */}
            <div className="hidden xs:flex items-center gap-1.5 sm:gap-2">
              <div className="flex gap-0.5 sm:gap-1">
                {Array.from({ length: maxQuestions }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all",
                      i < questionCount
                        ? "bg-accent"
                        : "bg-foreground/30 sm:bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] sm:text-xs text-foreground/70 sm:text-muted-foreground">
                {questionCount}/{maxQuestions}
              </span>
            </div>
          </div>

          {/* Divider - hidden on mobile */}
          <div className="hidden sm:block h-6 w-px bg-border/50" />

          {/* Action Buttons - Center */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Pause/Resume - Primary visual hierarchy */}
              {/* MOBILE FIX: min-w-[48px] min-h-[48px] ensures touch target compliance */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    className={cn(
                      "min-w-[48px] min-h-[48px] h-12 w-12 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl",
                      "transition-all cursor-pointer touch-manipulation",
                      isPaused
                        ? "bg-accent/30 border-2 border-accent text-accent hover:bg-accent/40"
                        : "bg-warning/30 border-2 border-warning text-warning hover:bg-warning/40"
                    )}
                    onClick={isPaused ? onResume : onPause}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPaused ? <Play size={20} /> : <Pause size={20} />}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="hidden sm:block">
                  <p>{isPaused ? "Resume" : "Pause"} <kbd className="ml-1 px-1.5 py-0.5 bg-muted rounded text-xs">Space</kbd></p>
                </TooltipContent>
              </Tooltip>

              {/* Stop - Destructive action */}
              {/* MOBILE FIX: min-w-[48px] min-h-[48px] ensures touch target compliance */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    className={cn(
                      "min-w-[48px] min-h-[48px] h-12 w-12 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl",
                      "bg-destructive/20 border-2 border-destructive/60",
                      "text-destructive hover:bg-destructive/30",
                      "transition-all cursor-pointer touch-manipulation"
                    )}
                    onClick={onStop}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Square size={18} />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="hidden sm:block">
                  <p>Stop <kbd className="ml-1 px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd></p>
                </TooltipContent>
              </Tooltip>

              {/* Divider - hidden on mobile */}
              <div className="hidden sm:block h-6 w-px bg-border/30 mx-1" />

              {/* Skip to Breakthrough - Accent action */}
              {/* MOBILE FIX: min-h-[48px] ensures touch target compliance */}
              {!isBreakthrough && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      className={cn(
                        "min-h-[48px] h-12 sm:h-10 px-4 sm:px-4 flex items-center gap-1.5 sm:gap-2 rounded-xl",
                        "bg-secondary/30 border-2 border-secondary",
                        "text-secondary hover:bg-secondary/40",
                        "transition-all cursor-pointer touch-manipulation font-medium text-xs sm:text-sm"
                      )}
                      onClick={onSkip}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Zap size={16} />
                      <span className="hidden xs:inline">Breakthrough</span>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="hidden sm:block">
                    <p>Skip to Breakthrough <kbd className="ml-1 px-1.5 py-0.5 bg-muted rounded text-xs">B</kbd></p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Save - hidden on mobile */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    className={cn(
                      "hidden sm:flex h-10 w-10 items-center justify-center rounded-xl",
                      "bg-accent/20 border-2 border-accent/50",
                      "text-accent hover:bg-accent/30",
                      "transition-all cursor-pointer"
                    )}
                    onClick={onSave}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Save size={16} />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Save <kbd className="ml-1 px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+S</kbd></p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* Status Badge - Right - simplified on mobile */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block h-6 w-px bg-border/50" />
            <div
              className={cn(
                "px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wide",
                sessionState === "active" && "bg-accent/30 text-accent border-2 border-accent/50",
                sessionState === "paused" && "bg-warning/30 text-warning border-2 border-warning/50",
                sessionState === "breakthrough" && "bg-secondary/30 text-secondary border-2 border-secondary/50"
              )}
            >
              {sessionState === "active" && "REC"}
              {sessionState === "paused" && "PAUSED"}
              {sessionState === "breakthrough" && "✨"}
            </div>
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
