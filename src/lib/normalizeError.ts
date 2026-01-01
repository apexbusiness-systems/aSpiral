/**
 * Shared Error Normalization Utility
 * 
 * Classifies errors into categories to distinguish between:
 * - 'empty': No data found (NOT an error - should show empty state)
 * - 'auth': Authentication/authorization failures (401/403)
 * - 'network': Network connectivity issues
 * - 'server': Server-side errors (5xx)
 * - 'unknown': Unclassified errors
 * 
 * CRITICAL: 'empty' must NEVER trigger error banners/toasts.
 */

export type ErrorKind = 'auth' | 'network' | 'server' | 'empty' | 'unknown';

export interface NormalizedError {
  kind: ErrorKind;
  message: string;
  raw: unknown;
  /** If true, this should NOT show an error banner */
  isNonError: boolean;
}

/**
 * Known PostgREST/Supabase error codes that indicate "no rows found"
 * These are NOT errors - they indicate valid empty states.
 */
const EMPTY_DATA_CODES = [
  'PGRST116', // "The result contains 0 rows" from .single()
  '406',      // Not Acceptable (sometimes returned for no rows)
];

/**
 * Auth-related HTTP status codes
 */
const AUTH_STATUS_CODES = [401, 403];

/**
 * Server error HTTP status codes
 */
const SERVER_STATUS_CODES = [500, 501, 502, 503, 504];

/**
 * Network error indicators in error messages
 */
const NETWORK_ERROR_PATTERNS = [
  'network',
  'fetch',
  'failed to fetch',
  'networkerror',
  'net::',
  'econnrefused',
  'econnreset',
  'enotfound',
  'etimedout',
  'offline',
  'no internet',
  'connection refused',
];

/**
 * Normalize any error into a consistent structure for UI handling
 */
export function normalizeError(error: unknown): NormalizedError {
  // Handle null/undefined
  if (error == null) {
    return {
      kind: 'unknown',
      message: 'An unknown error occurred',
      raw: error,
      isNonError: false,
    };
  }

  // Extract error details
  const errorObj = error as Record<string, unknown>;
  const code = String(errorObj.code ?? errorObj.statusCode ?? '').toUpperCase();
  const status = Number(errorObj.status ?? errorObj.statusCode ?? 0);
  const message = String(
    errorObj.message ?? 
    errorObj.error_description ?? 
    errorObj.error ?? 
    error
  ).toLowerCase();

  // 1. Check for "empty" (no rows) - NOT an error
  if (EMPTY_DATA_CODES.includes(code)) {
    return {
      kind: 'empty',
      message: 'No data found',
      raw: error,
      isNonError: true, // Critical: this should NOT show error UI
    };
  }

  // Also check message for "no rows" patterns
  if (
    message.includes('no rows') ||
    message.includes('0 rows') ||
    message.includes('row not found')
  ) {
    return {
      kind: 'empty',
      message: 'No data found',
      raw: error,
      isNonError: true,
    };
  }

  // 2. Check for auth errors
  if (AUTH_STATUS_CODES.includes(status)) {
    return {
      kind: 'auth',
      message: status === 401 
        ? 'Please sign in to continue' 
        : 'You do not have permission to access this resource',
      raw: error,
      isNonError: false,
    };
  }

  // Also check message for auth patterns
  if (
    message.includes('unauthorized') ||
    message.includes('unauthenticated') ||
    message.includes('not authenticated') ||
    message.includes('jwt') ||
    message.includes('token expired')
  ) {
    return {
      kind: 'auth',
      message: 'Please sign in to continue',
      raw: error,
      isNonError: false,
    };
  }

  // 3. Check for network errors
  if (NETWORK_ERROR_PATTERNS.some(pattern => message.includes(pattern))) {
    return {
      kind: 'network',
      message: 'Network error. Please check your connection and try again.',
      raw: error,
      isNonError: false,
    };
  }

  // Check if it's a TypeError related to fetch
  if (error instanceof TypeError && message.includes('fetch')) {
    return {
      kind: 'network',
      message: 'Network error. Please check your connection and try again.',
      raw: error,
      isNonError: false,
    };
  }

  // 4. Check for server errors
  if (SERVER_STATUS_CODES.includes(status) || status >= 500) {
    return {
      kind: 'server',
      message: 'Server error. Please try again later.',
      raw: error,
      isNonError: false,
    };
  }

  // 5. Default to unknown
  return {
    kind: 'unknown',
    message: typeof errorObj.message === 'string' 
      ? errorObj.message 
      : 'An unexpected error occurred',
    raw: error,
    isNonError: false,
  };
}

/**
 * Helper to determine if an error should show a destructive toast/banner
 */
export function shouldShowErrorBanner(error: unknown): boolean {
  const normalized = normalizeError(error);
  return !normalized.isNonError;
}

/**
 * Helper to get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}
