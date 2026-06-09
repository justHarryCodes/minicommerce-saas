import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import { useNotificationsStore } from '@/store/notifications';

const SOUND_KEY = 'notif_sound_enabled';

// Handler reads soundEnabled from the store each time a notification arrives,
// so toggling the preference takes effect immediately without a restart.
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const { soundEnabled } = useNotificationsStore.getState();
    return {
      shouldShowAlert: true,
      shouldPlaySound: soundEnabled,
      shouldSetBadge:  true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

// Load persisted sound preference into the store on app start.
export async function loadNotificationPreferences(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SOUND_KEY);
    if (stored !== null) {
      useNotificationsStore.getState().setSoundEnabled(stored !== 'false');
    }
  } catch {}
}

// Persist + update store when the user toggles the sound setting.
export async function setNotificationSound(enabled: boolean): Promise<void> {
  useNotificationsStore.getState().setSoundEnabled(enabled);
  await AsyncStorage.setItem(SOUND_KEY, String(enabled));
}

// Called on app load — shows the OS permission dialog early so vendors
// have notifications enabled before they ever place an order.
export async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name:             'New Orders',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#f97316',
      sound:            true,
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Constants.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name:             'New Orders',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#f97316',
      sound:            true,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[Push] No EAS projectId found — cannot get push token');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  console.log('[Push] Expo push token:', token);

  try {
    await api.post('/api/mobile/push-token', { token, platform: Platform.OS });
    console.log('[Push] Token registered with backend');
  } catch (e) {
    console.warn('[Push] Failed to register token:', e);
  }

  return token;
}
