import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type LoadingStage = "extracting" | "generating" | "breakthrough" | "processing";

interface LoadingStateProps {
  stage: LoadingStage;
  className?: string;
}

const stageMessages: Record<LoadingStage, { title: string; subtitle: string; icon: string }> = {
  extracting: {
    title: "Extracting elements",
    subtitle: "Finding what matters",
    icon: "🔍",
  },
  generating: {
    title: "Generating question",
    subtitle: "Getting to the core",
    icon: "💭",
  },
  breakthrough: {
    title: "Synthesizing breakthrough",
    subtitle: "Connecting the dots",
    icon: "✨",
  },
  processing: {
    title: "Processing",
    subtitle: "Almost there",
    icon: "⚡",
  },
};

export function LoadingState({ stage, className }: LoadingStateProps) {
  const { title, subtitle, icon } = stageMessages[stage];
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={cn(
        "fixed z-50",
        // Mobile: bottom sheet style, Desktop: centered
        isMobile 
          ? "bottom-4 left-4 right-4" 
          : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        "flex flex-col items-center gap-3 p-6",
        "bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl",
        isMobile && "rounded-xl",
        className
      )}
    >
      {/* Animated Icon + Spinner */}
      <div className="relative w-14 h-14 flex items-center justify-center">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 border-2 border-primary/20 rounded-full"
          style={{ borderTopColor: "hsl(var(--primary))" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner counter-rotating ring */}
        <motion.div
          className="absolute inset-2 border-2 border-secondary/20 rounded-full"
          style={{ borderTopColor: "hsl(var(--secondary))" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        {/* Stage icon */}
        <motion.span 
          key={icon}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-xl z-10"
        >
          {icon}
        </motion.span>
      </div>

      {/* Text */}
      <div className="text-center">
        <motion.p 
          key={title}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-foreground"
        >
          {title}
        </motion.p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      {/* Progress bar */}
      <div className={cn("h-1 bg-muted rounded-full overflow-hidden", isMobile ? "w-full" : "w-40")}>
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}
