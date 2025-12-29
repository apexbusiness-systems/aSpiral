import { motion, AnimatePresence } from "framer-motion";
import { Flame, AlertTriangle } from "lucide-react";
import { useEngagementStore } from "@/stores/engagementStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StreakBadgeProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StreakBadge({ className = "", showLabel = false, size = "md" }: StreakBadgeProps) {
  const { streak, getStreakStatus } = useEngagementStore();
  const { isAtRisk, hoursRemaining } = getStreakStatus();

  if (!streak || streak.currentStreak === 0) {
    return null;
  }

  const sizeClasses = {
    sm: "text-sm gap-1",
    md: "text-base gap-1.5",
    lg: "text-lg gap-2",
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center ${sizeClasses[size]} ${className}`}
        >
          <AnimatePresence mode="wait">
            {isAtRisk ? (
              <motion.div
                key="at-risk"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="relative"
              >
                <Flame 
                  size={iconSizes[size]} 
                  className="text-warning animate-pulse" 
                />
                <AlertTriangle 
                  size={iconSizes[size] * 0.5} 
                  className="absolute -top-1 -right-1 text-destructive" 
                />
              </motion.div>
            ) : (
              <motion.div
                key="normal"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Flame 
                  size={iconSizes[size]} 
                  className="text-warning" 
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.span
            key={streak.currentStreak}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`font-semibold ${isAtRisk ? "text-warning" : "text-foreground"}`}
          >
            {streak.currentStreak}
          </motion.span>
          
          {showLabel && (
            <span className="text-muted-foreground">
              day{streak.currentStreak !== 1 ? "s" : ""}
            </span>
          )}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">
            🔥 {streak.currentStreak} day streak!
          </p>
          {isAtRisk ? (
            <p className="text-warning text-sm">
              ⚠️ At risk! {Math.floor(hoursRemaining)}h left to maintain
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Best: {streak.longestStreak} days • Total: {streak.totalBreakthroughs}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
