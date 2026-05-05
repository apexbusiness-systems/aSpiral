import { useEffect, useState, useCallback } from 'react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  scheduleSessionReminder,
  scheduleEngagementReminder,
  cancelSessionReminder,
  initNativePushNotifications,
  setupNativePushListeners,
} from '@/lib/pushNotifications';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [nativeToken, setNativeToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Check support and permission on mount
  useEffect(() => {
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
  }, []);

  // Set up native push listeners
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const cleanup = setupNativePushListeners(
      (notification: { title?: string; body?: string }) => {
        toast({
          title: notification.title || 'Session Reminder',
          description: notification.body || 'Time to continue your spiral journey!',
        });
      },
      (action: { notification?: { data?: { sessionId?: string } } }) => {
        const sessionId = action.notification?.data?.sessionId;
        if (sessionId) {
          window.location.href = `/sessions/${encodeURIComponent(sessionId)}`;
        }
      }
    );

    return cleanup;
  }, [toast]);

  const enableNotifications = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'Notifications not supported',
        description: 'Your browser does not support notifications.',
        variant: 'destructive',
      });
      return false;
    }

    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');

    if (granted) {
      // For native, also get the push token
      if (Capacitor.isNativePlatform()) {
        const token = await initNativePushNotifications();
        setNativeToken(token);
      }

      toast({
        title: 'Notifications enabled',
        description: 'You will receive session reminders and updates.',
      });

      // Schedule a test notification in 5 seconds
      setTimeout(() => {
        showNotification('Notifications Active', {
          body: 'You\'ll now receive reminders to continue your spiral journey.',
        });
      }, 5000);

      return true;
    } else {
      toast({
        title: 'Notifications blocked',
        description: 'Please enable notifications in your browser settings.',
        variant: 'destructive',
      });
      return false;
    }
  }, [isSupported, toast]);

  const sendTestNotification = useCallback(() => {
    if (permission !== 'granted') {
      toast({
        title: 'Notifications not enabled',
        description: 'Please enable notifications first.',
        variant: 'destructive',
      });
      return;
    }

    showNotification('Test Notification', {
      body: 'Your notifications are working correctly!',
    });
  }, [permission, toast]);

  const scheduleReminder = useCallback((
    sessionId: string,
    sessionTitle: string,
    reminderTime: Date
  ) => {
    if (permission !== 'granted') {
      return false;
    }
    scheduleSessionReminder(sessionId, sessionTitle, reminderTime);
    return true;
  }, [permission]);

  const cancelReminder = useCallback((sessionId: string) => {
    cancelSessionReminder(sessionId);
  }, []);

  const scheduleEngagement = useCallback((delayMinutes: number = 30) => {
    if (permission !== 'granted') return false;
    scheduleEngagementReminder(delayMinutes);
    return true;
  }, [permission]);

  return {
    isSupported,
    isEnabled: permission === 'granted',
    permission,
    nativeToken,
    enableNotifications,
    sendTestNotification,
    scheduleReminder,
    cancelReminder,
    scheduleEngagement,
  };
}
