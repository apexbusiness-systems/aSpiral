import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encrypt, decrypt } from '@/lib/crypto';
import { EventQueue } from '../eventQueue';

// Mock supabase before anything else
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));

const TEST_SECRET = 'test-secret-123';

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
    length: 0,
    key: (index: number) => null,
  };
})();

// Set up globals for environment without window (like Bun/Node)
if (typeof global !== 'undefined' && !global.localStorage) {
  (global as any).localStorage = localStorageMock;
}
if (typeof window !== 'undefined' && !window.localStorage) {
  (window as any).localStorage = localStorageMock;
}

describe('EventQueue Security (AES-GCM)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should encrypt data when saving to localStorage', async () => {
    const queue = new EventQueue(TEST_SECRET);
    await queue.waitReady();

    const event: any = {
      id: '123',
      type: 'aspiral:breakthrough.achieved',
      payload: { friction: 'sensitive data' },
      metadata: { idempotencyKey: 'key1' }
    };

    await queue.enqueue(event);

    const stored = localStorage.getItem('omnilink_event_queue');
    expect(stored).not.toBeNull();

    // It should not be plaintext JSON
    expect(() => JSON.parse(stored!)).toThrow();

    // It should be decryptable
    const decrypted = await decrypt(stored!, TEST_SECRET);
    const parsed = JSON.parse(decrypted);
    expect(parsed[0].event.payload.friction).toBe('sensitive data');
  });

  it('should migrate plaintext data to encrypted format', async () => {
    const plaintextData = [
      {
        event: {
          id: 'old-1',
          type: 'aspiral:session.started',
          payload: { userId: 'user-1' },
          metadata: { idempotencyKey: 'old-key' }
        },
        queuedAt: Date.now(),
        attempts: 0
      }
    ];

    localStorage.setItem('omnilink_event_queue', JSON.stringify(plaintextData));

    // When a new EventQueue is created, it should load and migrate
    const queue = new EventQueue(TEST_SECRET);
    await queue.waitReady();

    expect(queue.size()).toBe(1);
    expect((await queue.peek())?.event.id).toBe('old-1');

    // The data in localStorage should now be encrypted
    const stored = localStorage.getItem('omnilink_event_queue');
    expect(() => JSON.parse(stored!)).toThrow();

    const decrypted = await decrypt(stored!, TEST_SECRET);
    expect(JSON.parse(decrypted)).toHaveLength(1);
  });

  it('should handle corrupted data gracefully', async () => {
    localStorage.setItem('omnilink_event_queue', 'not-even-base64-!!!');

    const queue = new EventQueue(TEST_SECRET);
    await queue.waitReady();
    expect(queue.size()).toBe(0);
  });

  it('should fail-safe if decryption fails with wrong secret', async () => {
    const queue = new EventQueue(TEST_SECRET);
    await queue.waitReady();
    await queue.enqueue({ id: 'test', metadata: { idempotencyKey: 't1' } } as any);

    const stored = localStorage.getItem('omnilink_event_queue');

    // Try to decrypt with wrong secret
    try {
      await decrypt(stored!, 'wrong-secret');
      expect('should have thrown').toBe('did not throw');
    } catch (e) {
      expect(e.message).toBe('Decryption failed');
    }
  });
});
