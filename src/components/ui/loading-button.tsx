import { forwardRef } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn("relative", className)}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner size="sm" />
          </span>
        )}
        <span className={cn(loading && "opacity-0")}>
          {loading && loadingText ? loadingText : children}
        </span>
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";
