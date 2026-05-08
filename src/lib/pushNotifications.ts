import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export interface PushNotificationToken {
  value: string;
}

// Store scheduled reminder timeouts
const scheduledReminders: Map<string, number> = new Map();

/**
 * Check if notifications are supported (browser or native)
 */
export function isNotificationSupported(): boolean {
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (Capacitor.isNativePlatform()) {
    return 'default'; // Will be determined by native prompt
  }
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission (works for both web and native)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // Native platform - use Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      const permStatus = await PushNotifications.requestPermissions();
      return permStatus.receive === 'granted';
    } catch (error) {
      console.error('Native notification permission error:', error);
      return false;
    }
  }

  // Web platform - use Notification API
  if (!('Notification' in window)) {
    console.log('Notifications not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Notification permission error:', error);
    return false;
  }
}

/**
 * Show a notification immediately
 */
export function showNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
    onClick?: () => void;
  }
): void {
  if (Capacitor.isNativePlatform()) {
    // Native notifications would be handled by the server sending push
    console.log('Native notification:', title, options);
    return;
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Cannot show notification - not permitted');
    return;
  }

  const notification = new Notification(title, {
    body: options?.body,
    icon: options?.icon || '/icons/icon-512.svg',
    tag: options?.tag,
    data: options?.data,
  });

  if (options?.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }
}

/**
 * Schedule a session reminder notification
 */
export function scheduleSessionReminder(
  sessionId: string,
  sessionTitle: string,
  reminderTime: Date
): void {
  // Cancel any existing reminder for this session
  cancelSessionReminder(sessionId);

  const now = Date.now();
  const delay = reminderTime.getTime() - now;

  if (delay <= 0) {
    console.log('Reminder time has already passed');
    return;
  }

  const timeoutId = window.setTimeout(() => {
    showNotification('Continue Your Journey', {
      body: `Ready to continue "${sessionTitle}"? Your spiral awaits.`,
      tag: `session-${sessionId}`,
      data: { sessionId },
      onClick: () => {
        window.location.href = `/sessions/${sessionId}`;
      },
    });
    scheduledReminders.delete(sessionId);
  }, delay);

  scheduledReminders.set(sessionId, timeoutId);
  console.log('Session reminder scheduled:', { sessionId, sessionTitle, reminderTime });
}

/**
 * Cancel a scheduled session reminder
 */
export function cancelSessionReminder(sessionId: string): void {
  const timeoutId = scheduledReminders.get(sessionId);
  if (timeoutId !== undefined) {
    window.clearTimeout(timeoutId);
    scheduledReminders.delete(sessionId);
    console.log('Session reminder cancelled:', sessionId);
  }
}

/**
 * Schedule an engagement reminder (e.g., "Come back and continue!")
 */
export function scheduleEngagementReminder(delayMinutes: number = 30): void {
  const reminderId = 'engagement-reminder';
  
  // Cancel existing engagement reminder
  const existingId = scheduledReminders.get(reminderId);
  if (existingId !== undefined) {
    window.clearTimeout(existingId);
  }

  const timeoutId = window.setTimeout(() => {
    showNotification('Miss Your Spiral?', {
      body: 'Transform confusion into clarity. Continue your journey now.',
      tag: 'engagement',
      onClick: () => {
        window.location.href = '/';
      },
    });
    scheduledReminders.delete(reminderId);
  }, delayMinutes * 60 * 1000);

  scheduledReminders.set(reminderId, timeoutId);
}

/**
 * Initialize push notifications for native platforms
 */
export async function initNativePushNotifications(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
      
      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token: PushNotificationToken) => {
          console.log('Push registration success, token:', token.value);
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (error: unknown) => {
          console.error('Push registration error:', error);
          resolve(null);
        });
      });
    }
    return null;
  } catch (error) {
    console.error('Error initializing native push notifications:', error);
    return null;
  }
}

/**
 * Set up listeners for native push notifications
 */
export function setupNativePushListeners(
  onNotificationReceived?: (notification: unknown) => void,
  onNotificationActionPerformed?: (notification: unknown) => void
): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  const receivedListener = PushNotifications.addListener(
    'pushNotificationReceived',
    (notification) => {
      console.log('Push notification received:', notification);
      onNotificationReceived?.(notification);
    }
  );

  const actionListener = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification) => {
      console.log('Push notification action performed:', notification);
      onNotificationActionPerformed?.(notification);
    }
  );

  return () => {
    receivedListener.then(l => l.remove());
    actionListener.then(l => l.remove());
  };
}
