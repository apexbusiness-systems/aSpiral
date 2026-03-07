import { createLogger } from '../logger';

const logger = createLogger('SilentSentinel');

const SENTINEL_KEYS = {
  CRASH_COUNT: 'sentinel_crash_count',
  LAST_BOOT: 'sentinel_last_boot',
};

const CRASH_THRESHOLD = 3;
const BOOT_LOOP_WINDOW_MS = 5000;
const STABILITY_WINDOW_MS = 10000;

export const SilentSentinel = {
  init: () => {
    try {
      // 1. Check if we just recovered from an emergency
      if (sessionStorage.getItem('sentinel_just_recovered')) {
        logger.debug('Recovery successful. Monitoring resumed.');
        sessionStorage.removeItem('sentinel_just_recovered');
        // Reset last boot to now so we don't flag this valid boot as a crash later
        localStorage.setItem(SENTINEL_KEYS.LAST_BOOT, Date.now().toString());
        return;
      }

      const now = Date.now();
      const lastBoot = parseInt(localStorage.getItem(SENTINEL_KEYS.LAST_BOOT) || '0', 10);
      const crashCount = parseInt(localStorage.getItem(SENTINEL_KEYS.CRASH_COUNT) || '0', 10);

      if (now - lastBoot < BOOT_LOOP_WINDOW_MS) {
        const newCount = crashCount + 1;
        logger.warn(`Rapid boot detected. Count: ${newCount}`);
        localStorage.setItem(SENTINEL_KEYS.CRASH_COUNT, newCount.toString());

        if (newCount > CRASH_THRESHOLD) {
          SilentSentinel.emergencyProtocol();
          return;
        }
      }

      localStorage.setItem(SENTINEL_KEYS.LAST_BOOT, now.toString());

      setTimeout(() => {
        logger.debug('Stability achieved. Resetting counters.');
        localStorage.setItem(SENTINEL_KEYS.CRASH_COUNT, '0');
      }, STABILITY_WINDOW_MS);

    } catch (e) {
      logger.error('Initialization failed', e instanceof Error ? e : new Error(String(e)));
    }
  },

  recordError: (error: unknown) => {
    logger.error('Error captured:', error instanceof Error ? error : new Error(String(error)));
  },

  emergencyProtocol: () => {
    logger.error('EXECUTE TACTICAL NUKE: EMERGENCY PROTOCOL ENGAGED');
    const authToken = sessionStorage.getItem('supabase.auth.token');
    
    // Clear all storage but preserve auth token
    localStorage.clear();
    sessionStorage.clear();
    if (authToken) sessionStorage.setItem('supabase.auth.token', authToken);
    
    // Reset crash count
    localStorage.setItem(SENTINEL_KEYS.CRASH_COUNT, '0');

    // CRITICAL FIX: Signal recovery to next boot and DO NOT update LAST_BOOT here
    sessionStorage.setItem('sentinel_just_recovered', 'true');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) registration.unregister();
      });
    }
    window.location.reload();
  }
};
