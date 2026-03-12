// Storage key for analytics preference
export const ANALYTICS_ENABLED_KEY = 'aspiral_analytics_enabled';

/**
 * Check if user has opted out of analytics
 */
export function isAnalyticsEnabled(): boolean {
  try {
    return localStorage.getItem(ANALYTICS_ENABLED_KEY) !== 'false';
  } catch {
    return true; // Default to enabled if localStorage unavailable
  }
}
