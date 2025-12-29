import { Mic, MicOff, Square, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface MicButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  isPaused?: boolean;
  onClick: () => void;
  onPause?: () => void;
  onStop?: () => void;
}

export function MicButton({
  isRecording,
  isProcessing,
  isSupported,
  isPaused = false,
  onClick,
  onPause,
  onStop,
}: MicButtonProps) {
  const isMobile = useIsMobile();
  
  // Larger touch targets on mobile
  const mainSize = isMobile ? "h-24 w-24" : "h-20 w-20";
  const secondarySize = isMobile ? "h-14 w-14" : "h-12 w-12";
  const iconSize = isMobile ? "h-10 w-10" : "h-8 w-8";
  const smallIconSize = isMobile ? "h-5 w-5" : "h-4 w-4";

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        size="lg"
        disabled
        className={cn("rounded-full glass-card", isMobile ? "h-20 w-20" : "h-16 w-16")}
      >
        <MicOff className="h-6 w-6 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <div className={cn("relative flex items-center", isMobile ? "gap-4" : "gap-3")}>
      {/* Stop Button - visible when recording */}
      <AnimatePresence>
        {isRecording && onStop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={onStop}
              size="lg"
              variant="ghost"
              className={cn(
                "rounded-full touch-manipulation",
                secondarySize,
                "bg-destructive/20 border border-destructive/40",
                "hover:bg-destructive/30 active:scale-95 transition-all"
              )}
            >
              <Square className={cn(smallIconSize, "text-destructive fill-destructive")} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Mic Button */}
      <div className="relative">
        {/* Outer glow ring when not recording */}
        {!isRecording && !isProcessing && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-secondary to-accent opacity-20 blur-xl animate-pulse" />
        )}
        
        <Button
          onClick={onClick}
          disabled={isProcessing}
          size="lg"
          className={cn(
            "relative rounded-full transition-all duration-500 touch-manipulation",
            mainSize,
            "border-2 backdrop-blur-sm",
            isRecording
              ? "bg-destructive border-destructive/50 hover:bg-destructive/90 active:scale-95 mic-pulse"
              : "bg-gradient-to-br from-primary to-secondary border-primary/30 hover:scale-105 active:scale-95 shadow-glow"
          )}
        >
          {isRecording ? (
            <Square className={cn("fill-current text-destructive-foreground", isMobile ? "h-7 w-7" : "h-6 w-6")} />
          ) : (
            <Mic className={cn("text-primary-foreground drop-shadow-lg", iconSize)} />
          )}
        </Button>
        
        {/* Recording indicator ring */}
        {isRecording && (
          <div className="absolute -inset-2 rounded-full border-2 border-destructive/50 animate-ping" />
        )}
      </div>

      {/* Pause Button - visible when recording */}
      <AnimatePresence>
        {isRecording && onPause && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={onPause}
              size="lg"
              variant="ghost"
              className={cn(
                "rounded-full touch-manipulation",
                secondarySize,
                isPaused 
                  ? "bg-accent/20 border border-accent/40 hover:bg-accent/30"
                  : "bg-warning/20 border border-warning/40 hover:bg-warning/30",
                "active:scale-95 transition-all"
              )}
            >
              {isPaused ? (
                <Play className={cn(smallIconSize, "text-accent")} />
              ) : (
                <Pause className={cn(smallIconSize, "text-warning")} />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
