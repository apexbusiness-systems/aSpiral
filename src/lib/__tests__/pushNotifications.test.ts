import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleSessionReminder } from '../pushNotifications';

describe('pushNotifications security', () => {
  beforeEach(() => {
    const loc = { href: '' };
    Object.defineProperty(window, 'location', { value: loc, writable: true, configurable: true });
    const nMock = vi.fn().mockImplementation(function(this: any) {
      this.onclick = null;
      this.close = vi.fn();
      return this;
    });
    (nMock as any).permission = 'granted';
    (window as any).Notification = nMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const runTest = async (sid: string, expected: string) => {
    scheduleSessionReminder(sid, 'T', new Date(Date.now() + 10));
    await new Promise(r => setTimeout(r, 50));
    const inst = (window.Notification as any).mock.instances[0];
    if (inst?.onclick) inst.onclick();
    expect(window.location.href).toBe(expected);
  };

  it('handles traversal', () => runTest('../t', '/sessions/..%2Ft'));
  it('handles redirect', () => runTest('//e.c', '/sessions/%2F%2Fe.c'));
});
