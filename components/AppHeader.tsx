import { Image } from 'expo-image';
import { Linking, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Store } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDrawerStore } from '@/store/drawer';
import { Colors } from '@/constants/theme';
import type { Store as StoreType } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../assets/logo.png') as number;

interface Props {
  /** Extra icon(s) to render alongside the shop icon on the right (e.g. bell) */
  right?: React.ReactNode;
}

export function AppHeader({ right }: Props) {
  const insets = useSafeAreaInsets();
  const open   = useDrawerStore(s => s.open);

  const { data: store } = useQuery<StoreType>({
    queryKey: ['store'],
    queryFn:  () => api.get<StoreType>('/api/dashboard/store'),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <StatusBar backgroundColor={Colors.dark} barStyle="light-content" />

      <View style={styles.row}>
        {/* ── Left: hamburger ─────────────────────────────────── */}
        <Pressable
          onPress={open}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.65 : 1 }]}
          hitSlop={10}
        >
          <Menu size={24} color="#fff" strokeWidth={2.2} />
        </Pressable>

        {/* ── Centre: logo ─────────────────────────────────────── */}
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} contentFit="contain" />
        </View>

        {/* ── Right: optional extras + storefront link ─────────── */}
        <View style={styles.rightGroup}>
          {right}
          <Pressable
            onPress={() =>
              store?.slug
                ? Linking.openURL(`https://${store.slug}.awarizon.shop`)
                : undefined
            }
            style={({ pressed }) => [styles.shopBtn, { opacity: pressed ? 0.75 : 1 }]}
            hitSlop={8}
          >
            <Store size={20} color={Colors.dark} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
  },

  // Left button
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Centre logo
  logoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },

  // Right group
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  shopBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accent: {
    height: 3,
    backgroundColor: Colors.brand,
  },
});
