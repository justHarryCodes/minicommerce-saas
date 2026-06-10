import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';
import { useDrawerStore } from '@/store/drawer';
import { auth } from '@/lib/firebase';
import { registerForPushNotifications } from '@/lib/notifications';
import { api } from '@/lib/api';
import { DrawerContent } from '@/components/AppDrawer';

const DRAWER_W = Math.min(Dimensions.get('window').width * 0.82, 320);

function DrawerOverlay() {
  const { isOpen, close } = useDrawerStore();
  const slideX  = useRef(new Animated.Value(-DRAWER_W)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.55,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: -DRAWER_W,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark backdrop — tap to close */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: fadeAnim }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Sliding panel */}
      <Animated.View
        style={[
          styles.panel,
          { width: DRAWER_W, transform: [{ translateX: slideX }] },
        ]}
      >
        <DrawerContent navigation={{ closeDrawer: close }} />
      </Animated.View>
    </View>
  );
}

export default function AppLayout() {
  const { user, loading } = useAuthStore();
  const currentUser = user ?? auth.currentUser;
  const setUnreadCount = useNotificationsStore(s => s.setUnreadCount);

  useEffect(() => {
    if (currentUser) registerForPushNotifications();
  }, [!!currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [!!currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { type?: string; orderId?: string };
      if (data?.type === 'order') router.push('/(app)/orders' as never);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const data = response.notification.request.content.data as { type?: string };
      if (data?.type === 'order') router.push('/(app)/orders' as never);
    });
  }, []);

  if (loading) return null;
  if (!currentUser) return <Redirect href="/(auth)/login" />;

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      <DrawerOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 24,
  },
});
