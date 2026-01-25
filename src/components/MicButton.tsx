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
  
  // RESPONSIVE SIZING: Viewport-relative units for mobile adaptation
  // Mobile: 20vw width with min 80px (ensures touch target >= 48px on all devices)
  // Desktop: Fixed 72px for consistency
  // All sizes guarantee minimum 48px touch target (WCAG 2.5.5)
  const mainSize = isMobile
    ? "h-[20vw] w-[20vw] min-h-[88px] min-w-[88px] max-h-[124px] max-w-[124px]"
    : "h-[72px] w-[72px]";
  const secondarySize = isMobile
    ? "h-[12vw] w-[12vw] min-h-[52px] min-w-[52px] max-h-[68px] max-w-[68px]"
    : "h-12 w-12";
  const iconSize = isMobile ? "h-[6vw] min-h-[24px] w-[6vw] min-w-[24px]" : "h-7 w-7";
  const smallIconSize = isMobile ? "h-[4vw] min-h-[16px] w-[4vw] min-w-[16px]" : "h-4 w-4";

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
        aria-label="Microphone unavailable"
        className={cn("rounded-full glass-card", mainSize)}
      >
        <MicOff className="h-6 w-6 text-muted-foreground" />
      </Button>
    );
  }

  const getAriaLabel = () => {
    if (isProcessing) return "Processing audio...";
    if (isRecording) return isPaused ? "Resume recording" : "Stop recording";
    return "Start recording";
  };

  return (
    <div className={cn("relative flex items-center justify-center", isMobile ? "gap-4" : "gap-3", "min-h-[104px]")}>
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
              aria-label="End session"
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
        {/* Outer glow ring when not recording */}
        {!isRecording && !isProcessing && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
            animate={{
              opacity: [0.3, 0.5, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
        
        <Button
          onClick={handleMainClick}
          onPointerDown={() => setIsMainPressed(true)}
          onPointerUp={() => setIsMainPressed(false)}
          onPointerLeave={() => setIsMainPressed(false)}
          disabled={isProcessing}
          size="lg"
          aria-label={getAriaLabel()}
          className={cn(
            "relative rounded-full transition-transform duration-75 touch-manipulation select-none z-10",
            mainSize,
            "border-2 backdrop-blur-sm shadow-xl",
            isRecording
              ? "bg-destructive border-destructive/50 hover:bg-destructive/90 mic-pulse ring-4 ring-destructive/20"
              : "bg-gradient-to-br from-primary to-purple-600 border-primary/30",
            isMainPressed ? "scale-90" : "scale-100"
          )}
        >
          {isProcessing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : isRecording ? (
             <div className="flex flex-col items-center justify-center">
                 <Mic className={cn("text-white animate-pulse", iconSize)} />
             </div>
          ) : (
            <Mic className={cn("text-white drop-shadow-md", iconSize)} />
          )}
        </Button>
        
        {/* Recording ripple effect */}
        {isRecording && !isPaused && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-destructive/50"
              animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-destructive/30"
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, delay: 0.5, repeat: Infinity }}
            />
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
              aria-label={isPaused ? "Resume" : "Pause"}
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
