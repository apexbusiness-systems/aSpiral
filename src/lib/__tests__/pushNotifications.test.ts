import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleSessionReminder } from '../pushNotifications';

/**
 * Security verification for push notification redirection
 * Ensures sessionId is correctly encoded to prevent Open Redirect / Path Traversal
 */
describe('pushNotifications security', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Setup window.location mock
    const locationMock = {
      ...originalLocation,
      href: '',
    };
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
      configurable: true
    });

    // Setup Notification API mock
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

  it('neutralizes path traversal attempts in sessionId', async () => {
    const maliciousId = '../traversal';
    const reminderTime = new Date(Date.now() + 10);

    scheduleSessionReminder(maliciousId, 'Test', reminderTime);

    // Wait for the internal setTimeout in scheduleSessionReminder
    await new Promise(resolve => setTimeout(resolve, 50));

    const notification = (window.Notification as any).mock.instances[0];
    if (notification && notification.onclick) {
      notification.onclick();
    }

    // Expect: encoded path segment
    expect(window.location.href).toBe('/sessions/..%2Ftraversal');
  });

  it('neutralizes protocol-relative open redirect attempts', async () => {
    const maliciousId = '//evil.com';
    const reminderTime = new Date(Date.now() + 10);

    scheduleSessionReminder(maliciousId, 'Test', reminderTime);

    await new Promise(resolve => setTimeout(resolve, 50));

    const notification = (window.Notification as any).mock.instances[0];
    if (notification && notification.onclick) {
      notification.onclick();
    }

    // Expect: encoded slashes to prevent browser interpretation as protocol-relative
    expect(window.location.href).toBe('/sessions/%2F%2Fevil.com');
  });
});
