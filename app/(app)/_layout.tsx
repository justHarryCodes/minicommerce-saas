import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';
import { auth } from '@/lib/firebase';
import { registerForPushNotifications } from '@/lib/notifications';
import { api } from '@/lib/api';

export default function AppLayout() {
  const { user, loading } = useAuthStore();
  const currentUser = user ?? auth.currentUser;
  const setUnreadCount = useNotificationsStore(s => s.setUnreadCount);

  // Register push token when authenticated
  useEffect(() => {
    if (currentUser) registerForPushNotifications();
  }, [!!currentUser]);

  // Fetch unread count and keep it updated
  useEffect(() => {
    if (!currentUser) return;

    function refresh() {
      api.get<{ unreadCount: number }>('/api/mobile/notifications')
        .then(({ unreadCount }) => setUnreadCount(unreadCount))
        .catch(() => {});
    }

    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [!!currentUser]);

  // Navigate to orders when user taps a push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as {
        type?: string;
        orderId?: string;
      };
      if (data?.type === 'order') {
        router.push('/(app)/orders');
      }
    });
    return () => sub.remove();
  }, []);

  // Handle cold-start: app opened via notification tap while not running
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const data = response.notification.request.content.data as {
        type?: string;
      };
      if (data?.type === 'order') {
        router.push('/(app)/orders');
      }
    });
  }, []);

  if (loading) return null;
  if (!currentUser) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
