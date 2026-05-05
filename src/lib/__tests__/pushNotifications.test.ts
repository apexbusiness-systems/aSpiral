import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleSessionReminder } from '../pushNotifications';

// Define global variables if they don't exist (for bun test environment)
if (typeof window === 'undefined') {
  (globalThis as any).window = {
    location: { href: '' },
    setTimeout: (cb: any, ms: any) => setTimeout(cb, ms),
    clearTimeout: (id: any) => clearTimeout(id),
    focus: vi.fn(),
  };
}

describe('pushNotifications security', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Properly mock window.location
    const locationMock = {
      ...originalLocation,
      href: '',
    };
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
      configurable: true
    });

    // Mock Notification
    const mockNotification = vi.fn().mockImplementation(function(this: any) {
      this.onclick = null;
      this.close = vi.fn();
      return this;
    });
    (mockNotification as any).permission = 'granted';
    (window as any).Notification = mockNotification;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('vulnerability check: sessionId can cause path traversal if not escaped', async () => {
    const maliciousSessionId = '../malicious-target';
    const sessionTitle = 'Test Session';
    // Small delay for testing without fake timers if they are not available
    const reminderTime = new Date(Date.now() + 10);

    scheduleSessionReminder(maliciousSessionId, sessionTitle, reminderTime);

    // Wait for the timeout to trigger
    await new Promise(resolve => setTimeout(resolve, 50));

    // Get the notification instance
    const notificationInstance = (window.Notification as any).mock.instances[0] as any;

    // Trigger the click
    if (notificationInstance && notificationInstance.onclick) {
      notificationInstance.onclick();
    }

    // Check where it tried to redirect
    // Expect encoded version
    expect(window.location.href).toBe('/sessions/..%2Fmalicious-target');
  });

  it('vulnerability check: sessionId can cause open redirect if it starts with //', async () => {
    const maliciousSessionId = '//evil.com';
    const sessionTitle = 'Test Session';
    const reminderTime = new Date(Date.now() + 10);

    scheduleSessionReminder(maliciousSessionId, sessionTitle, reminderTime);

    await new Promise(resolve => setTimeout(resolve, 50));

    const notificationInstance = (window.Notification as any).mock.instances[0] as any;

    if (notificationInstance && notificationInstance.onclick) {
      notificationInstance.onclick();
    }

    // Expect encoded version
    expect(window.location.href).toBe('/sessions/%2F%2Fevil.com');
  });
});
