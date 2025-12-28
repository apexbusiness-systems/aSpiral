import { motion } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmationModalProps {
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const actionConfigs: Record<string, {
  icon: typeof AlertTriangle;
  title: string;
  message: string;
  confirmText: string;
  confirmVariant: "destructive" | "default";
  showSave: boolean;
}> = {
  stop: {
    icon: AlertTriangle,
    title: "Stop Session?",
    message: "Your progress will be lost unless you save first.",
    confirmText: "Stop",
    confirmVariant: "destructive",
    showSave: true,
  },
  restart: {
    icon: AlertTriangle,
    title: "Restart Session?",
    message: "This will clear your current progress and start fresh.",
    confirmText: "Restart",
    confirmVariant: "destructive",
    showSave: true,
  },
  exit: {
    icon: Info,
    title: "Exit ASPIRAL?",
    message: "Your session will be saved automatically.",
    confirmText: "Exit",
    confirmVariant: "default",
    showSave: false,
  },
};

export function ConfirmationModal({
  action,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const config = actionConfigs[action];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <motion.div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className={cn(
          "w-[90%] max-w-md p-8",
          "bg-card/95 backdrop-blur-xl",
          "border border-border/50 rounded-2xl",
          "shadow-2xl text-center"
        )}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "inline-flex items-center justify-center",
            "w-16 h-16 mb-6",
            "bg-muted/50 border border-border/50 rounded-full",
            "text-yellow-500"
          )}
        >
          <Icon size={32} />
        </div>

        <h3 className="text-2xl font-bold text-foreground mb-3">
          {config.title}
        </h3>

        <p className="text-muted-foreground leading-relaxed mb-8">
          {config.message}
        </p>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          {config.showSave && (
            <Button
              variant="secondary"
              onClick={() => {
                // Save first, then cancel
                onCancel();
              }}
            >
              Save & {config.confirmText}
            </Button>
          )}

          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
          >
            {config.confirmText}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
