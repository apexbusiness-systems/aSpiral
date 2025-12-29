import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import type { Achievement } from "@/lib/types";

interface AchievementToastProps {
  achievement: Achievement;
}

export function AchievementToast({ achievement }: AchievementToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="flex items-center gap-3 p-4 rounded-xl glass-card border border-secondary/30"
    >
      <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-2xl">
        {achievement.icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-secondary" />
          <span className="text-xs text-secondary uppercase tracking-wider font-semibold">
            Achievement Unlocked!
          </span>
        </div>
        <p className="font-semibold text-foreground">{achievement.name}</p>
        <p className="text-sm text-muted-foreground">{achievement.description}</p>
      </div>
    </motion.div>
  );
}
