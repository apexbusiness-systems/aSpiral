import React, { Component, ErrorInfo, ReactNode } from 'react';
import { analytics } from '@/lib/analytics';
import { addBreadcrumb, setFatalErrorSnapshot } from '@/lib/debugOverlay';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary for Capacitor mobile compatibility.
 * Catches unhandled errors and displays a user-friendly recovery screen
 * instead of a blank screen on iOS/Android.
 */
class GlobalErrorBoundary extends Component<Props, State> {
  private hasLoggedFatal = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error for debugging - critical for mobile diagnostics
    console.error('[GlobalErrorBoundary] Caught error:', error);
    console.error('[GlobalErrorBoundary] Component stack:', errorInfo.componentStack);

    setFatalErrorSnapshot({
      message: error.message || 'Unknown error',
      stack: error.stack?.slice(0, 2000),
    });
    addBreadcrumb({ type: 'system', message: 'fatal_ui_error' });

    if (!import.meta.env.DEV && !this.hasLoggedFatal) {
      this.hasLoggedFatal = true;
      const trimmedStack = error.stack ? error.stack.slice(0, 2000) : undefined;
      const deviceMemory =
        typeof navigator !== 'undefined' && 'deviceMemory' in navigator
          ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
          : undefined;

      analytics.trackFatalUiError({
        message: error.message || 'Unknown error',
        stack: trimmedStack,
        route: window.location.href,
        userAgent: navigator.userAgent,
        deviceMemory,
      });
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1033 50%, #0d0820 100%)',
            color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Aurora-style glow effect */}
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />

          {/* Error icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.4)',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '12px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: '#a1a1aa',
              textAlign: 'center',
              marginBottom: '24px',
              maxWidth: '300px',
            }}
          >
            The app encountered an unexpected error. Please try reloading.
          </p>

          {/* Error details box */}
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              background: 'rgba(30, 20, 50, 0.8)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              overflow: 'auto',
              maxHeight: '200px',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#f87171',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Error Details
            </p>
            <pre
              style={{
                fontSize: '11px',
                color: '#fca5a5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
              }}
            >
              {error?.message || 'Unknown error'}
            </pre>
            {errorInfo?.componentStack && (
              <details style={{ marginTop: '12px' }}>
                <summary
                  style={{
                    fontSize: '11px',
                    color: '#a1a1aa',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  Component Stack
                </summary>
                <pre
                  style={{
                    fontSize: '10px',
                    color: '#71717a',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    marginTop: '8px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                  }}
                >
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>

          {/* Reload button */}
          <button
            onClick={this.handleReload}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(124, 58, 237, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(124, 58, 237, 0.4)';
            }}
          >
            Reload App
          </button>

          {/* Version/debug info */}
          <p
            style={{
              position: 'absolute',
              bottom: '24px',
              fontSize: '10px',
              color: '#52525b',
            }}
          >
            aSpiral Error Recovery
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
