import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SilentSentinel } from '../SilentSentinel';

describe('SilentSentinel', () => {
  const createMockStorage = () => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get store() {
        return store;
      },
    };
  };

  const localStorageMock = createMockStorage();
  const sessionStorageMock = createMockStorage();

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    vi.stubGlobal('location', { reload: vi.fn() });
    vi.stubGlobal('window', { location: { reload: vi.fn() } });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistrations: vi.fn().mockResolvedValue([]),
      },
    });

    localStorageMock.clear();
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('emergencyProtocol', () => {
    it('should clear storage but preserve auth token and signal recovery', () => {
      sessionStorage.setItem('supabase.auth.token', 'test-token');
      localStorage.setItem('other-key', 'value');
      sessionStorage.setItem('other-session-key', 'session-value');
      localStorage.setItem('sentinel_crash_count', '5');

      SilentSentinel.emergencyProtocol();

      // Check auth token preservation
      expect(sessionStorage.getItem('supabase.auth.token')).toBe('test-token');

      // Check other storage cleared
      expect(localStorage.getItem('other-key')).toBeNull();
      expect(sessionStorage.getItem('other-session-key')).toBeNull();

      // Check crash count reset
      expect(localStorage.getItem('sentinel_crash_count')).toBe('0');

      // Check recovery flag set
      expect(sessionStorage.getItem('sentinel_just_recovered')).toBe('true');

      // CRITICAL: Check LAST_BOOT is NOT set during emergencyProtocol
      expect(localStorage.getItem('sentinel_last_boot')).toBeNull();

      // Check reload called
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('init', () => {
    it('should consume recovery flag and set last boot if just recovered', () => {
      sessionStorage.setItem('sentinel_just_recovered', 'true');
      const now = 123456789;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      SilentSentinel.init();

      // Flag should be removed
      expect(sessionStorage.getItem('sentinel_just_recovered')).toBeNull();

      // Last boot should be set to now
      expect(localStorage.getItem('sentinel_last_boot')).toBe(now.toString());

      // Should return early and not set timeout for stability (we can check if setItem for CRASH_COUNT wasn't called again or something)
      // Actually, if it returns early, crash count won't be incremented even if lastBoot was old.
    });

    it('should increment crash count if rapid boot detected', () => {
      const lastBoot = 10000;
      const now = 12000; // 2 seconds later (< 5000ms window)
      localStorage.setItem('sentinel_last_boot', lastBoot.toString());
      localStorage.setItem('sentinel_crash_count', '1');
      vi.spyOn(Date, 'now').mockReturnValue(now);

      SilentSentinel.init();

      expect(localStorage.getItem('sentinel_crash_count')).toBe('2');
      expect(localStorage.getItem('sentinel_last_boot')).toBe(now.toString());
    });
  });
});
