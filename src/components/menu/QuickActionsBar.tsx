import { motion } from "framer-motion";
import { Pause, Play, Square, Zap, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickActionsBarProps {
  sessionState: "idle" | "active" | "paused" | "breakthrough";
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkip: () => void;
  onSave: () => void;
}

export function QuickActionsBar({
  sessionState,
  onPause,
  onResume,
  onStop,
  onSkip,
  onSave,
}: QuickActionsBarProps) {
  const isPaused = sessionState === "paused";
  const hasActiveSession = sessionState === "active" || sessionState === "paused";

  if (!hasActiveSession) return null;

  return (
    <TooltipProvider>
      <motion.div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-[99]",
          "flex gap-2 p-3",
          "bg-background/80 backdrop-blur-xl",
          "border border-border/50 rounded-2xl",
          "shadow-lg"
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              className={cn(
                "w-12 h-12 flex items-center justify-center",
                "bg-muted/50 border border-border/50 rounded-xl",
                "text-foreground cursor-pointer transition-all",
                "hover:bg-muted hover:-translate-y-0.5"
              )}
              onClick={isPaused ? onResume : onPause}
              whileTap={{ scale: 0.95 }}
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPaused ? "Resume" : "Pause"} (Space)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              className={cn(
                "w-12 h-12 flex items-center justify-center",
                "bg-destructive/20 border border-destructive/40 rounded-xl",
                "text-destructive cursor-pointer transition-all",
                "hover:bg-destructive/30 hover:-translate-y-0.5"
              )}
              onClick={onStop}
              whileTap={{ scale: 0.95 }}
            >
              <Square size={20} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stop (Esc)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              className={cn(
                "w-12 h-12 flex items-center justify-center",
                "bg-primary/20 border border-primary/40 rounded-xl",
                "text-primary cursor-pointer transition-all",
                "hover:bg-primary/30 hover:-translate-y-0.5"
              )}
              onClick={onSkip}
              whileTap={{ scale: 0.95 }}
            >
              <Zap size={20} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Skip to Breakthrough (B)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              className={cn(
                "w-12 h-12 flex items-center justify-center",
                "bg-green-500/20 border border-green-500/40 rounded-xl",
                "text-green-500 cursor-pointer transition-all",
                "hover:bg-green-500/30 hover:-translate-y-0.5"
              )}
              onClick={onSave}
              whileTap={{ scale: 0.95 }}
            >
              <Save size={20} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save (Ctrl+S)</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
}
