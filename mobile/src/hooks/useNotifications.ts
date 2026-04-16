import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/auth-context';
import {
  getNotificationsModule,
  registerForPushNotifications,
  savePushToken,
} from '../lib/notifications';

/**
 * Registers the device for push notifications when a user is signed in and
 * wires up deep-link handling for notification taps.
 *
 * No-ops in Expo Go since remote push was removed in SDK 53.
 */
export function useNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!user) return;

    const Notifications = getNotificationsModule();
    if (!Notifications) return; // Expo Go or native module missing

    let cancelled = false;
    (async () => {
      const token = await registerForPushNotifications();
      if (cancelled || !token) return;
      await savePushToken(user.id, token);
    })();

    // Tap handler — route to the correct cockpit screen based on payload.data
    subscriptionRef.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        const route = typeof data?.route === 'string' ? data.route : null;
        const threadId = typeof data?.threadId === 'string' ? data.threadId : null;
        if (threadId) {
          router.push(`/(tabs)/messages/${threadId}` as any);
        } else if (route) {
          router.push(route as any);
        }
      },
    );

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
    };
  }, [user, router]);
}
