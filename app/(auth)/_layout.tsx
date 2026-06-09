import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function AuthLayout() {
  const { user } = useAuthStore();
  if (user) return <Redirect href="/(app)" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
