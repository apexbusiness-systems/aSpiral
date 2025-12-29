import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MilestoneOverlayProps {
  type: "streak" | "achievement" | "breakthrough_count";
  value: number;
  label: string;
  isVisible: boolean;
  onDismiss: () => void;
}

const confettiColors = [
  "hsl(280, 85%, 65%)",
  "hsl(50, 95%, 55%)",
  "hsl(160, 64%, 52%)",
  "hsl(340, 80%, 55%)",
];

export function MilestoneOverlay({
  type,
  value,
  label,
  isVisible,
  onDismiss,
}: MilestoneOverlayProps) {
  const icons = {
    streak: Flame,
    achievement: Trophy,
    breakthrough_count: Star,
  };

  const Icon = icons[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
          onClick={onDismiss}
        >
          {/* Confetti particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 0,
              }}
              animate={{
                opacity: [1, 1, 0],
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                scale: [0, 1, 0.5],
                rotate: Math.random() * 720,
              }}
              transition={{
                duration: 1.5,
                delay: Math.random() * 0.3,
                ease: "easeOut",
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                backgroundColor: confettiColors[i % confettiColors.length],
              }}
            />
          ))}

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="flex flex-col items-center text-center p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon with glow */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  "0 0 20px hsl(50 95% 55% / 0.3)",
                  "0 0 60px hsl(50 95% 55% / 0.5)",
                  "0 0 20px hsl(50 95% 55% / 0.3)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mb-6"
            >
              <Icon className="w-12 h-12 text-secondary" />
            </motion.div>

            {/* Value */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-6xl font-bold text-gradient-gold mb-2"
            >
              {value}
            </motion.div>

            {/* Label */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl text-foreground mb-2"
            >
              {label}
            </motion.p>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Keep going!
            </motion.p>

            {/* Dismiss button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Button onClick={onDismiss} variant="secondary">
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
