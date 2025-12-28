import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type LoadingStage = "extracting" | "generating" | "breakthrough" | "processing";

interface LoadingStateProps {
  stage: LoadingStage;
  className?: string;
}

const stageMessages: Record<LoadingStage, { title: string; subtitle: string }> = {
  extracting: {
    title: "Extracting elements...",
    subtitle: "Finding what matters",
  },
  generating: {
    title: "Generating question...",
    subtitle: "Getting to the core",
  },
  breakthrough: {
    title: "Synthesizing breakthrough...",
    subtitle: "Connecting the dots",
  },
  processing: {
    title: "Processing...",
    subtitle: "Almost there",
  },
};

export function LoadingState({ stage, className }: LoadingStateProps) {
  const { title, subtitle } = stageMessages[stage];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
        "flex flex-col items-center gap-4 p-8",
        "bg-background/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl",
        className
      )}
    >
      {/* Spinner */}
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 border-3 border-primary/20 rounded-full"
          style={{ borderTopColor: "hsl(var(--primary))" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 border-2 border-secondary/20 rounded-full"
          style={{ borderTopColor: "hsl(var(--secondary))" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Text */}
      <div className="text-center">
        <motion.p 
          key={title}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-base font-medium text-foreground"
        >
          {title}
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
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
