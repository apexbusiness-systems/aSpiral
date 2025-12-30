import { Mic, MicOff, Square, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCallback, useRef, useState } from "react";

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
  
  // Local pressed state for instant visual feedback
  const [isMainPressed, setIsMainPressed] = useState(false);
  const [isStopPressed, setIsStopPressed] = useState(false);
  const [isPausePressed, setIsPausePressed] = useState(false);
  
  // Debounce protection
  const lastClickRef = useRef<number>(0);
  const DEBOUNCE_MS = 200;
  
  // Larger touch targets on mobile
  const mainSize = isMobile ? "h-24 w-24" : "h-20 w-20";
  const secondarySize = isMobile ? "h-14 w-14" : "h-12 w-12";
  const iconSize = isMobile ? "h-10 w-10" : "h-8 w-8";
  const smallIconSize = isMobile ? "h-5 w-5" : "h-4 w-4";

  // Debounced click handlers for reliability
  const handleMainClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < DEBOUNCE_MS) return;
    lastClickRef.current = now;
    onClick();
  }, [onClick]);

  const handleStopClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < DEBOUNCE_MS) return;
    lastClickRef.current = now;
    onStop?.();
  }, [onStop]);

  const handlePauseClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < DEBOUNCE_MS) return;
    lastClickRef.current = now;
    onPause?.();
  }, [onPause]);

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
            transition={{ duration: 0.15 }}
          >
            <Button
              onClick={handleStopClick}
              onPointerDown={() => setIsStopPressed(true)}
              onPointerUp={() => setIsStopPressed(false)}
              onPointerLeave={() => setIsStopPressed(false)}
              size="lg"
              variant="ghost"
              className={cn(
                "rounded-full touch-manipulation select-none",
                secondarySize,
                "bg-destructive/20 border border-destructive/40",
                "hover:bg-destructive/30 transition-transform duration-75",
                isStopPressed ? "scale-90" : "scale-100"
              )}
            >
              <Square className={cn(smallIconSize, "text-destructive fill-destructive")} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Mic Button */}
      <div className="relative">
        {/* Outer glow ring when not recording - enhanced with dramatic effect */}
        {!isRecording && !isProcessing && (
          <>
            <motion.div 
              className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-secondary to-accent blur-xl"
              animate={{
                opacity: [0.2, 0.35, 0.2],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Floating micro-particles around button */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
                style={{
                  left: `${50 + 45 * Math.cos((i * Math.PI * 2) / 4)}%`,
                  top: `${50 + 45 * Math.sin((i * Math.PI * 2) / 4)}%`,
                }}
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.3, 0.7, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
              />
            ))}
          </>
        )}
        
        <Button
          onClick={handleMainClick}
          onPointerDown={() => setIsMainPressed(true)}
          onPointerUp={() => setIsMainPressed(false)}
          onPointerLeave={() => setIsMainPressed(false)}
          disabled={isProcessing}
          size="lg"
          className={cn(
            "relative rounded-full transition-transform duration-75 touch-manipulation select-none",
            mainSize,
            "border-2 backdrop-blur-sm",
            isRecording
              ? "bg-destructive border-destructive/50 hover:bg-destructive/90 mic-pulse"
              : "bg-gradient-to-br from-primary to-secondary border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.4)]",
            isMainPressed ? "scale-90" : "scale-100"
          )}
        >
          {isRecording ? (
            <Square className={cn("fill-current text-destructive-foreground", isMobile ? "h-7 w-7" : "h-6 w-6")} />
          ) : (
            <Mic className={cn("text-primary-foreground drop-shadow-lg", iconSize)} />
          )}
        </Button>
        
        {/* Recording indicator ring - enhanced glow */}
        {isRecording && (
          <>
            <div className="absolute -inset-2 rounded-full border-2 border-destructive/50 animate-ping" />
            <div className="absolute -inset-3 rounded-full bg-destructive/20 blur-md animate-pulse" />
          </>
        )}
      </div>

      {/* Pause Button - visible when recording */}
      <AnimatePresence>
        {isRecording && onPause && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              onClick={handlePauseClick}
              onPointerDown={() => setIsPausePressed(true)}
              onPointerUp={() => setIsPausePressed(false)}
              onPointerLeave={() => setIsPausePressed(false)}
              size="lg"
              variant="ghost"
              className={cn(
                "rounded-full touch-manipulation select-none",
                secondarySize,
                isPaused 
                  ? "bg-accent/20 border border-accent/40 hover:bg-accent/30"
                  : "bg-warning/20 border border-warning/40 hover:bg-warning/30",
                "transition-transform duration-75",
                isPausePressed ? "scale-90" : "scale-100"
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
