import { useState, useCallback } from "react";
import { toast } from "sonner";

export type ActionStatus = "idle" | "loading" | "success" | "error";

export interface ActionHandlerOptions {
  actionName: string;
  demo?: boolean;
  locked?: boolean;
  lockedReason?: string;
  lockedCta?: string;
  lockedCtaAction?: () => void;
}

/**
 * Unified action handler that prevents dead UI
 * 
 * Usage patterns:
 * 1. Real action: executeAction("save", { actionName: "Save Progress" })
 * 2. Demo action: executeAction("demo", { actionName: "Preview", demo: true })
 * 3. Locked action: executeAction("locked", { actionName: "Premium Feature", locked: true, lockedReason: "Requires subscription" })
 */
export function executeAction(
  actionType: "real" | "demo" | "locked",
  options: ActionHandlerOptions
): void {
  const { actionName, demo = false, locked = false, lockedReason, lockedCta, lockedCtaAction } = options;

  switch (actionType) {
    case "real":
      // Real action - should be implemented by the calling component
      toast.error(`Action "${actionName}" not implemented yet`, {
        description: "This feature is under development",
      });
      break;

    case "demo":
      // Demo action - shows simulated behavior
      toast.info(`Demo: ${actionName}`, {
        description: "This is a demonstration of the feature",
      });
      break;

    case "locked":
      // Locked action - shows reason and optional CTA
      if (lockedReason) {
        const message = lockedCta 
          ? `${lockedReason} ${lockedCta}`
          : lockedReason;
        
        toast.warning(`Feature Locked: ${actionName}`, {
          description: message,
          action: lockedCtaAction ? {
            label: lockedCta || "Learn More",
            onClick: lockedCtaAction,
          } : undefined,
        });
      }
      break;

    default:
      toast.error("Unknown action type");
  }
}

/**
 * Hook for managing action state
 */
export function useActionState() {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const execute = useCallback((action: () => Promise<void>) => {
    setStatus("loading");
    setMessage("Processing...");
    
    action()
      .then(() => {
        setStatus("success");
        setMessage("Success!");
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 2000);
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "An error occurred");
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 3000);
      });
  }, []);

  return { status, message, execute };
}