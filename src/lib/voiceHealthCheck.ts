/**
 * Voice System Health Check
 *
 * Validates browser support for voice features at app startup.
 * Provides diagnostic information for debugging voice issues.
 *
 * @module voiceHealthCheck
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('VoiceHealthCheck');

export interface VoiceHealthStatus {
  /** Overall health status */
  healthy: boolean;
  /** Speech recognition available */
  sttSupported: boolean;
  /** Speech synthesis available */
  ttsSupported: boolean;
  /** Microphone permission status */
  micPermission: PermissionState | 'unknown';
  /** Available TTS voices count */
  voiceCount: number;
  /** Detected platform */
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  /** Browser info */
  browser: string;
  /** Warnings for potential issues */
  warnings: string[];
  /** Critical errors that block functionality */
  errors: string[];
  /** Timestamp of check */
  timestamp: number;
}

/**
 * Detects the current platform
 */
function detectPlatform(): VoiceHealthStatus['platform'] {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux/.test(ua)) return 'desktop';

  return 'unknown';
}

/**
 * Detects the browser name and version
 */
function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent;

  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';

  return 'unknown';
}

/**
 * Check if Speech Recognition is supported
 */
function checkSTTSupport(): boolean {
  if (typeof window === 'undefined') return false;

  return !!(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

/**
 * Check if Speech Synthesis is supported
 */
function checkTTSSupport(): boolean {
  if (typeof window === 'undefined') return false;

  return !!(
    window.speechSynthesis &&
    typeof window.speechSynthesis.speak === 'function'
  );
}

/**
 * Get available TTS voices count
 */
function getVoiceCount(): number {
  if (typeof window === 'undefined' || !window.speechSynthesis) return 0;

  try {
    return window.speechSynthesis.getVoices().length;
  } catch {
    return 0;
  }
}

/**
 * Check microphone permission status
 */
async function checkMicPermission(): Promise<PermissionState | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions) {
    return 'unknown';
  }

  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch {
    return 'unknown';
  }
}

/**
 * Run comprehensive voice system health check
 *
 * @returns Promise<VoiceHealthStatus> - Health status object
 *
 * @example
 * ```typescript
 * const health = await runVoiceHealthCheck();
 * if (!health.healthy) {
 *   console.error('Voice system issues:', health.errors);
 * }
 * ```
 */
export async function runVoiceHealthCheck(): Promise<VoiceHealthStatus> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const sttSupported = checkSTTSupport();
  const ttsSupported = checkTTSSupport();
  const micPermission = await checkMicPermission();
  const voiceCount = getVoiceCount();
  const platform = detectPlatform();
  const browser = detectBrowser();

  // Check for critical errors
  if (!sttSupported) {
    errors.push('Speech recognition not supported in this browser');
  }

  if (!ttsSupported) {
    errors.push('Speech synthesis not supported in this browser');
  }

  if (micPermission === 'denied') {
    errors.push('Microphone permission denied - voice input will not work');
  }

  // Check for warnings
  if (voiceCount === 0 && ttsSupported) {
    warnings.push('No TTS voices loaded yet - voices may load asynchronously');
  }

  if (platform === 'ios' && browser === 'Chrome') {
    warnings.push('Chrome on iOS uses WebKit - some features may differ from desktop Chrome');
  }

  if (platform === 'ios') {
    warnings.push('iOS Safari may require user gesture to start audio playback');
  }

  if (micPermission === 'prompt') {
    warnings.push('Microphone permission not yet granted - user will be prompted');
  }

  const healthy = errors.length === 0;

  const status: VoiceHealthStatus = {
    healthy,
    sttSupported,
    ttsSupported,
    micPermission,
    voiceCount,
    platform,
    browser,
    warnings,
    errors,
    timestamp: Date.now(),
  };

  // Log the health check results
  if (healthy) {
    logger.info('Voice system healthy', {
      platform,
      browser,
      sttSupported,
      ttsSupported,
      voiceCount,
    });
  } else {
    logger.error('Voice system unhealthy', { errors, warnings });
  }

  return status;
}

/**
 * Quick check if voice features are available (synchronous)
 * Use runVoiceHealthCheck() for detailed diagnostics
 */
export function isVoiceAvailable(): boolean {
  return checkSTTSupport() && checkTTSSupport();
}

/**
 * Subscribe to voice health changes (e.g., permission changes)
 */
export function subscribeToVoiceHealth(
  callback: (status: VoiceHealthStatus) => void
): () => void {
  let mounted = true;

  // Initial check
  runVoiceHealthCheck().then((status) => {
    if (mounted) callback(status);
  });

  // Listen for permission changes
  if (typeof navigator !== 'undefined' && navigator.permissions) {
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((permissionStatus) => {
        permissionStatus.onchange = () => {
          if (mounted) {
            runVoiceHealthCheck().then(callback);
          }
        };
      })
      .catch(() => {
        // Permissions API not available
      });
  }

  // Listen for voices changed
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const handleVoicesChanged = () => {
      if (mounted) {
        runVoiceHealthCheck().then(callback);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

    return () => {
      mounted = false;
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }

  return () => {
    mounted = false;
  };
}
