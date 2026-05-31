import { Button } from "@/components/ui/button";
import { Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface LockedActionProps {
  children: React.ReactNode;
  reason: string;
  cta?: string;
  onCtaClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Standardized locked action component
 * 
 * Usage:
 * <LockedAction 
 *   reason="Requires premium subscription" 
 *   cta="Upgrade Plan"
 *   onCtaClick={() => navigate('/upgrade')}
 * >
 *   Save Progress
 * </LockedAction>
 */
export function LockedAction({
  children,
  reason,
  cta,
  onCtaClick,
  variant = "default",
  size = "default",
}: LockedActionProps) {
  const handleClick = () => {
    const message = cta ? `${reason} ${cta}` : reason;
    
    toast.warning("Feature Locked", {
      description: message,
      action: onCtaClick ? {
        label: cta || "Learn More",
        onClick: onCtaClick,
      } : undefined,
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={false} // Always enabled to show lock UX
      className="relative"
    >
      <Lock className="mr-2 h-4 w-4 opacity-70" />
      {children}
      <span className="sr-only">Locked: {reason}</span>
    </Button>
  );
}

/**
 * Alternative locked action with different visual treatment
 */
export function LockedActionAlert({
  children,
  reason,
  cta,
  onCtaClick,
}: LockedActionProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/50 rounded-lg">
      <AlertCircle className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <div className="font-medium">{children}</div>
        <div className="text-sm text-muted-foreground">{reason}</div>
      </div>
      {cta && onCtaClick && (
        <Button variant="outline" size="sm" onClick={onCtaClick}>
          {cta}
        </Button>
      )}
    </div>
  );
}