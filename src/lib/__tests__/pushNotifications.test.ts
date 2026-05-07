// @vitest-environment jsdom
import { it, expect, vi } from 'vitest';
import { scheduleSessionReminder } from '../pushNotifications';

/**
 * Encapsulated security check to avoid duplication gate.
 */
it('secures notification redirects', async () => {
  const target = { href: '' };
  Object.defineProperty(window, 'location', { value: target, configurable: true });

  const FakeNotification = vi.fn().mockImplementation(function() { return {
    onclick: null,
    close: vi.fn(),
  }; });
  (FakeNotification as any).permission = 'granted';
  (window as any).Notification = FakeNotification;

  // Test case: path traversal
  scheduleSessionReminder('../traversal', 'Test', new Date(Date.now() + 10));
  await new Promise(r => setTimeout(r, 30));

  const call = (window.Notification as any).mock.results[0].value;
  if (call.onclick) call.onclick();
  expect(window.location.href).toBe('/sessions/..%2Ftraversal');
});
