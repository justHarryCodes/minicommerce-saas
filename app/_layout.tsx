import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { loadNotificationPreferences, requestNotificationPermission } from '@/lib/notifications';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Load persisted sound preference before any notification can arrive
    loadNotificationPreferences().catch(() => {});
    // Ask for permission early so it's granted before the vendor logs in
    requestNotificationPermission().catch(() => {});
  }, []);

  useEffect(() => {
    let settled = false;

    function settle() {
      if (settled) return;
      settled = true;
      setLoading(false);
      SplashScreen.hideAsync().catch(() => {});
    }

    console.log('[RootLayout] subscribing to onAuthStateChanged');

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      console.log('[RootLayout] onAuthStateChanged →', fbUser ? fbUser.email : 'null');
      setUser(fbUser);
      settle();
    });

    // If Firebase never responds, unblock the UI after 5s
    const timer = setTimeout(() => {
      if (!settled) {
        console.warn('[RootLayout] Firebase auth timeout — forcing null');
        setUser(null);
        settle();
      }
    }, 5000);

    return () => { unsub(); clearTimeout(timer); };
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
          <Toast />
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
