/**
 * Voice Error Boundary
 *
 * Catches errors in voice components and provides graceful degradation.
 * Prevents voice-related crashes from taking down the entire app.
 *
 * @module VoiceErrorBoundary
 */

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/logger';
import { isVoiceAvailable, runVoiceHealthCheck, VoiceHealthStatus } from '@/lib/voiceHealthCheck';

const logger = createLogger('VoiceErrorBoundary');

interface VoiceErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to show when voice is unavailable (not an error) */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Whether to show a retry button */
  showRetry?: boolean;
}

interface VoiceErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  healthStatus: VoiceHealthStatus | null;
  isRetrying: boolean;
}

/**
 * Error boundary specifically for voice-related components.
 *
 * Wraps voice components (MicButton, TTS controls, etc.) to:
 * - Catch and log errors without crashing the app
 * - Provide user-friendly error messages
 * - Allow retry/recovery
 * - Show fallback UI when voice isn't supported
 *
 * @example
 * ```tsx
 * <VoiceErrorBoundary fallback={<TextOnlyMode />}>
 *   <MicButton />
 *   <TTSControls />
 * </VoiceErrorBoundary>
 * ```
 */
export class VoiceErrorBoundary extends Component<
  VoiceErrorBoundaryProps,
  VoiceErrorBoundaryState
> {
  constructor(props: VoiceErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      healthStatus: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<VoiceErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('Voice component error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Run health check to diagnose the issue
    runVoiceHealthCheck().then((status) => {
      this.setState({ healthStatus: status });
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = async (): Promise<void> => {
    this.setState({ isRetrying: true });

    // Run health check before retry
    const status = await runVoiceHealthCheck();

    if (status.healthy) {
      // Clear error state and retry
      this.setState({
        hasError: false,
        error: null,
        healthStatus: status,
        isRetrying: false,
      });
    } else {
      // Still unhealthy, keep error state but update health status
      this.setState({
        healthStatus: status,
        isRetrying: false,
      });
    }
  };

  renderErrorUI(): ReactNode {
    const { showRetry = true } = this.props;
    const { error, healthStatus, isRetrying } = this.state;

    const errorMessage = error?.message ?? 'An error occurred with the voice system';
    const hasVoiceSupport = isVoiceAvailable();

    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Voice System Error</span>
        </div>

        <p className="text-sm text-muted-foreground max-w-xs">
          {errorMessage}
        </p>

        {healthStatus && healthStatus.errors.length > 0 && (
          <ul className="text-xs text-muted-foreground list-disc list-inside">
            {healthStatus.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}

        {!hasVoiceSupport && (
          <p className="text-xs text-muted-foreground">
            Your browser may not support voice features. Try Chrome or Safari.
          </p>
        )}

        <div className="flex gap-2">
          {showRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              disabled={isRetrying}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  render(): ReactNode {
    const { children, fallback } = this.props;
    const { hasError } = this.state;

    // Check if voice is available at all
    if (!isVoiceAvailable() && fallback) {
      return fallback;
    }

    if (hasError) {
      return this.renderErrorUI();
    }

    return children;
  }
}

// Note: Additional voice UI components (VoiceStatusIndicator, VoiceUnavailableFallback)
// can be added to a separate file if needed to satisfy react-refresh requirements.
