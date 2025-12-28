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
        "fixed top-3 right-3 sm:top-4 sm:right-4 z-[999]",
        "w-12 h-12 sm:w-14 sm:h-14",
        "flex items-center justify-center",
        // Solid background on mobile for contrast
        "bg-card sm:bg-background/60 sm:backdrop-blur-xl",
        "border-2 border-foreground/20 sm:border-border/50 rounded-full",
        "cursor-pointer transition-all duration-200",
        "hover:bg-card/90 sm:hover:bg-background/80 hover:border-primary/50"
      )}
      onClick={onMenuOpen}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <Menu size={22} className="text-foreground" />

      {/* State indicator */}
      <div
        className={cn(
          "absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full",
          "border-2 border-card sm:border-background",
          sessionState === "idle" && "bg-muted-foreground",
          sessionState === "active" && "bg-green-500 animate-pulse",
          sessionState === "paused" && "bg-yellow-500",
          sessionState === "breakthrough" && "bg-primary"
        )}
      />

      {/* Keyboard hint - desktop only */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className={cn(
              "hidden sm:block absolute -left-14",
              "px-2 py-1",
              "bg-card border border-border/50 rounded-md",
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
