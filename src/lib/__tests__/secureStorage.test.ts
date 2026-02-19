// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDeviceFingerprint, getEncryptionSecret } from '../secureStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

if (typeof global !== 'undefined' && !global.localStorage) {
  (global as any).localStorage = localStorageMock;
}

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user-id' } } } })),
    },
  },
}));

describe('SecureStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should generate a persistent device fingerprint', () => {
    // Ensure we are simulating a browser environment
    
    // Mock crypto.randomUUID
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: vi.fn().mockReturnValue('test-uuid-1'),
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
        }
      },
      writable: true
    });

    const f1 = getDeviceFingerprint();
    // Subsequent call should return same fingerprint from localStorage
    const f2 = getDeviceFingerprint();

    expect(f1).toBe('test-uuid-1');
    expect(f2).toBe('test-uuid-1');
    expect(localStorage.getItem('aspiral_device_fingerprint')).toBe(f1);
  });

  it('should derive an encryption secret', async () => {
    const secret = await getEncryptionSecret();
    expect(secret).toBeDefined();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(0);
  });

  it('should derive different secrets for different users', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    (supabase.auth.getSession as any).mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } } });
    const s1 = await getEncryptionSecret();

    (supabase.auth.getSession as any).mockResolvedValueOnce({ data: { session: { user: { id: 'user-2' } } } });
    const s2 = await getEncryptionSecret();

    expect(s1).not.toBe(s2);
  });

  it('should derive different secrets for different devices', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });

    // Force a specific UUID for first call
    const cryptoMock = {
      randomUUID: vi.fn()
        .mockReturnValueOnce('device-1')
        .mockReturnValueOnce('device-2'),
      subtle: {
        digest: vi.fn().mockImplementation(async (algo, data) => {
          // Simple mock digest to ensure different inputs produce different outputs
          const arr = Array.from(data as Uint8Array);
          return new Uint8Array(arr).buffer;
        })
      }
    };

    Object.defineProperty(globalThis, 'crypto', {
      value: cryptoMock,
      writable: true
    });

    // Clear ANY existing fingerprint
    localStorage.removeItem('aspiral_device_fingerprint');
    
    const s1 = await getEncryptionSecret();

    // Clear fingerprint to force generation of a NEW device ID
    localStorage.removeItem('aspiral_device_fingerprint');
    const s2 = await getEncryptionSecret();

    expect(s1).not.toBe(s2);
  });
});
