import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { signOut } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '@/lib/firebase';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ChevronRight, CreditCard, FileText, Film, HelpCircle, Link2, LogOut, Store } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';
import { setNotificationSound } from '@/lib/notifications';
import { AppHeader } from '@/components/AppHeader';
import { Colors } from '@/constants/theme';
import type { Store as StoreType } from '@/types';

function SettingRow({ icon, label, sub, onPress, danger, hideChevron }: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
  hideChevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        {icon}
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {!hideChevron && <ChevronRight size={16} color={Colors.surface[300]} />}
    </Pressable>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const soundEnabled = useNotificationsStore(s => s.soundEnabled);

  const { data: store } = useQuery<StoreType>({
    queryKey: ['store'],
    queryFn: () => api.get<StoreType>('/api/dashboard/store'),
  });

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          try {
            await GoogleSignin.signOut().catch(() => {}); // clears cached Google account
            await signOut(auth);
            router.replace('/(auth)/login');
          } catch {
            Toast.show({ type: 'error', text1: 'Sign out failed' });
          }
        },
      },
    ]);
  }

  const initials = (user?.displayName ?? user?.email ?? '?')[0].toUpperCase();

  const subStatus = store?.subscriptionStatus;
  const subColor  = subStatus === 'subscribed' ? Colors.success
    : subStatus === 'expired' ? Colors.error : Colors.surface[400];
  const subLabel  = subStatus === 'subscribed' ? 'Active'
    : subStatus === 'expired' ? 'Expired' : 'Inactive';

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Settings" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.displayName ?? 'Vendor'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          {subStatus && (
            <View style={[styles.subBadge, { backgroundColor: subColor + '18' }]}>
              <View style={[styles.subDot, { backgroundColor: subColor }]} />
              <Text style={[styles.subLabel, { color: subColor }]}>{subLabel}</Text>
            </View>
          )}
        </View>

        {/* Store info */}
        {store && (
          <View style={styles.storeCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeSlug}>{store.slug}.awarizon.shop</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(`https://${store.slug}.awarizon.shop`)}
              style={({ pressed }) => [styles.visitBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Text style={styles.visitText}>Visit →</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.sections}>
          {/* Store */}
          <SectionLabel title="STORE" />
          <View style={styles.group}>
            <SettingRow icon={<Store size={18} color={Colors.surface[600]} />}        label="Store settings"        sub="Name, logo, description"    onPress={() => Linking.openURL('https://awarizon.shop/dashboard/settings')} />
            <SettingRow icon={<CreditCard size={18} color={Colors.surface[600]} />}   label="Billing & subscription" sub="Setup fee, monthly plan"     onPress={() => router.push('/(app)/billing')} />
            <SettingRow icon={<Link2 size={18} color={Colors.surface[600]} />}        label="Affiliate program"      sub="Earn by referring vendors"   onPress={() => Linking.openURL('https://awarizon.shop/affiliate')} />
          </View>

          {/* Content */}
          <SectionLabel title="CONTENT" />
          <View style={styles.group}>
            <SettingRow icon={<Film size={18} color={Colors.surface[600]} />} label="Reels" sub="Manage your product videos" onPress={() => router.push('/(app)/reels')} />
          </View>

          {/* Support */}
          <SectionLabel title="SUPPORT" />
          <View style={styles.group}>
            {/* Notification sound toggle */}
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Bell size={18} color={Colors.surface[600]} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Notification sound</Text>
                <Text style={styles.rowSub}>Play sound for new orders</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={v => setNotificationSound(v).catch(() => {})}
                trackColor={{ false: Colors.surface[200], true: Colors.brand + 'aa' }}
                thumbColor={soundEnabled ? Colors.brand : Colors.surface[300]}
              />
            </View>
            <SettingRow icon={<HelpCircle size={18} color={Colors.surface[600]} />} label="Help & support" sub="Chat with us"         onPress={() => Linking.openURL('https://awarizon.shop/dashboard')} />
            <SettingRow icon={<FileText size={18} color={Colors.surface[600]} />}  label="Terms of service"                           onPress={() => Linking.openURL('https://awarizon.shop/terms')} />
          </View>

          {/* Sign out */}
          <View style={[styles.group, styles.dangerGroup]}>
            <SettingRow icon={<LogOut size={18} color={Colors.error} />} label="Sign out" danger hideChevron onPress={handleLogout} />
          </View>
        </View>

        <Text style={styles.version}>Duka Vendors v1.0.0 · Powered by Awarizon</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface[100],
  },
  profileCard: {
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.brand,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.surface[900],
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.surface[400],
    marginTop: 1,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  subDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  storeCard: {
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surface[200],
    gap: 12,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface[900],
  },
  storeSlug: {
    fontSize: 11,
    color: Colors.surface[400],
    marginTop: 2,
  },
  visitBtn: {
    backgroundColor: Colors.brand,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  visitText: {
    fontWeight: '700',
    fontSize: 13,
    color: Colors.dark,
  },
  sections: {
    marginHorizontal: 16,
    marginTop: 12,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.surface[400],
    letterSpacing: 1,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 2,
  },
  group: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
  dangerGroup: {
    borderColor: '#fecaca',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface[100],
    gap: 12,
  },
  rowPressed: {
    backgroundColor: Colors.surface[50],
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: '#fee2e2',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.surface[900],
  },
  rowLabelDanger: {
    color: Colors.error,
  },
  rowSub: {
    fontSize: 12,
    color: Colors.surface[400],
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.surface[300],
    marginVertical: 32,
  },
});
