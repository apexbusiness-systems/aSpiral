import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingMenuButtonProps {
  sessionState: "idle" | "active" | "paused" | "breakthrough";
  onMenuOpen: () => void;
}

export function FloatingMenuButton({
  sessionState,
  onMenuOpen,
}: FloatingMenuButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className={cn(
        "fixed top-4 right-4 z-[999] w-14 h-14",
        "flex items-center justify-center",
        "bg-background/60 backdrop-blur-xl",
        "border border-border/50 rounded-full",
        "cursor-pointer transition-all duration-300",
        "hover:bg-background/80 hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
      )}
      onClick={onMenuOpen}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
    >
      <motion.div
        animate={{ rotate: isHovered ? 90 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <Menu size={24} className="text-foreground" />
      </motion.div>

      {/* State indicator */}
      <motion.div
        className={cn(
          "absolute bottom-1 right-1 w-3 h-3 rounded-full",
          "border-2 border-background",
          sessionState === "idle" && "bg-muted-foreground",
          sessionState === "active" && "bg-green-500 animate-pulse",
          sessionState === "paused" && "bg-yellow-500",
          sessionState === "breakthrough" && "bg-primary animate-[glow_1s_ease-in-out_infinite]"
        )}
        layoutId="state-indicator"
      />

      {/* Keyboard hint */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className={cn(
              "absolute -left-14",
              "px-2 py-1",
              "bg-background/90 border border-border/50 rounded-md",
              "whitespace-nowrap text-sm text-muted-foreground"
            )}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <kbd className="px-1.5 py-0.5 bg-muted/50 border border-border/50 rounded text-xs font-mono">
              M
            </kbd>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
