import { useEffect } from 'react';
import { ActivityIndicator, Image, StatusBar, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { Colors } from '@/constants/theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../assets/logo.png') as number;

export default function RootIndex() {
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace('/(app)');
    else router.replace('/discover');
  }, [user, loading]);

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={Colors.dark} barStyle="light-content" />
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator color={Colors.brand} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: Colors.white,
  },
  spinner: { marginTop: 24 },
});
