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
      const now = Date.now();
      const lastBoot = parseInt(localStorage.getItem(SENTINEL_KEYS.LAST_BOOT) || '0', 10);
      const crashCount = parseInt(localStorage.getItem(SENTINEL_KEYS.CRASH_COUNT) || '0', 10);

      if (now - lastBoot < BOOT_LOOP_WINDOW_MS) {
        const newCount = crashCount + 1;
        console.warn(`[SilentSentinel] Rapid boot detected. Count: ${newCount}`);
        localStorage.setItem(SENTINEL_KEYS.CRASH_COUNT, newCount.toString());

        if (newCount > CRASH_THRESHOLD) {
          SilentSentinel.emergencyProtocol();
          return;
        }
      }

      localStorage.setItem(SENTINEL_KEYS.LAST_BOOT, now.toString());

      setTimeout(() => {
        console.log('[SilentSentinel] Stability achieved. Resetting counters.');
        localStorage.setItem(SENTINEL_KEYS.CRASH_COUNT, '0');
      }, STABILITY_WINDOW_MS);

    } catch (e) {
      console.error('[SilentSentinel] Initialization failed', e);
    }
  },

  recordError: (error: unknown) => {
    console.error('[SilentSentinel] Error captured:', error);
  },

  emergencyProtocol: () => {
    console.error('[SilentSentinel] EXECUTE TACTICAL NUKE: EMERGENCY PROTOCOL ENGAGED');
    const authToken = localStorage.getItem('supabase.auth.token');
    localStorage.clear();
    if (authToken) localStorage.setItem('supabase.auth.token', authToken);
    localStorage.setItem(SENTINEL_KEYS.CRASH_COUNT, '0');
    localStorage.setItem(SENTINEL_KEYS.LAST_BOOT, Date.now().toString());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) registration.unregister();
      });
    }
    window.location.reload();
  }
};
