import { Image, Linking, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { Bell, Copy, ExternalLink, Inbox, Store } from 'lucide-react-native';
import { useNotificationsStore } from '@/store/notifications';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../../../assets/logo.png') as number;

import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Colors } from '@/constants/theme';
import type { Store as StoreType } from '@/types';
import { StatsCard } from '@/components/StatsCard';
import { OrderCard } from '@/components/OrderCard';
import { RevenueChart } from '@/components/RevenueChart';
import type { DashboardStats } from '@/types';

function fmt(n: number) {
  if (n >= 1_000_000) return '₦' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return '₦' + (n / 1_000).toFixed(1) + 'K';
  return '₦' + n.toLocaleString();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function mapOrder(o: Record<string, unknown>): DashboardStats['recentOrders'][number] {
  const firstImage = (o.first_image as string) ?? null;
  const itemCount  = Number(o.item_count ?? 0);
  return {
    id:              String(o.id ?? ''),
    orderNumber:     String(o.order_number   ?? o.orderNumber   ?? ''),
    customerName:    String(o.customer_name  ?? o.customerName  ?? ''),
    customerPhone:   String(o.customer_phone ?? o.customerPhone ?? ''),
    customerEmail:   null,
    deliveryAddress: '',
    deliveryCity: null, deliveryState: null, deliveryNote: null,
    paymentMethod:   (o.payment_method ?? o.paymentMethod) as never,
    paymentStatus:   String(o.payment_status  ?? o.paymentStatus  ?? ''),
    orderStatus:     String(o.order_status    ?? o.orderStatus    ?? ''),
    totalAmount:     Number(o.total_amount ?? o.total ?? o.subtotal ?? 0),
    discountAmount: 0,
    couponCode: null,
    items: firstImage || itemCount > 0 ? [{
      id: '', productId: '', productName: '',
      quantity: itemCount, unitPrice: 0, totalPrice: 0,
      imageUrl: firstImage,
    }] : [],
    createdAt: String(o.created_at ?? o.createdAt ?? ''),
    updatedAt: String(o.updated_at ?? o.updatedAt ?? ''),
  };
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const firstName = user?.displayName?.split(' ')[0] ?? 'Vendor';
  const unreadCount = useNotificationsStore(s => s.unreadCount);

  const { data: store } = useQuery<StoreType>({
    queryKey: ['store'],
    queryFn: () => api.get<StoreType>('/api/dashboard/store'),
    enabled: !!user,
  });
  const storeUrl = store?.slug ? `${store.slug}.awarizon.shop` : null;

  async function copyStoreUrl() {
    if (!storeUrl) return;
    await Clipboard.setStringAsync(`https://${storeUrl}`);
    Toast.show({ type: 'success', text1: 'Link copied!', text2: storeUrl });
  }

  const { data, isLoading, error, refetch, isRefetching } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    enabled: !!user,
    queryFn: async () => {
      const raw = await api.get<Record<string, unknown>>('/api/dashboard/stats');
      return {
        totalOrders:   Number(raw.totalOrders),
        totalRevenue:  Number(raw.totalRevenue),
        todayOrders:   Number(raw.todayOrders),
        todayRevenue:  Number(raw.todayRevenue),
        pendingOrders: Number(raw.pendingOrders),
        totalProducts: Number(raw.totalProducts),
        recentOrders:  (raw.recentOrders as Record<string, unknown>[] ?? []).map(mapOrder),
      };
    },
  });

  if ((error as Error)?.message?.includes('No store')) {
    return (
      <SafeAreaView style={styles.noStoreSafe}>
        <Store size={48} color={Colors.brand} style={{ marginBottom: 16 }} />
        <Text style={styles.noStoreTitle}>No store found</Text>
        <Text style={styles.noStoreSub}>
          Your account isn&apos;t linked to a store yet. Set up your store on the Awarizon dashboard first.
        </Text>
        <View style={styles.noStoreActions}>
          <Text
            onPress={() => Linking.openURL('https://awarizon.shop/onboarding')}
            style={styles.noStoreCta}
          >
            Set up my store →
          </Text>
          <Text onPress={() => refetch()} style={styles.noStoreRetry}>
            I already set it up — retry
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={Colors.dark} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerInner}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.bellBtn, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => router.push('/(app)/notifications')}
            hitSlop={8}
          >
            <Bell size={22} color="#fff" strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
        <View style={styles.headerAccent} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Store card — logo + name + link */}
        {store && (
          <View style={styles.storeLinkCard}>
            {store.logoUrl ? (
              <Image source={{ uri: store.logoUrl }} style={styles.storeCardLogo} />
            ) : (
              <View style={styles.storeCardLogoFallback}>
                <Store size={22} color={Colors.brand} />
              </View>
            )}
            <View style={styles.storeCardInfo}>
              <Text style={styles.storeCardName} numberOfLines={1}>{store.name}</Text>
              {storeUrl && (
                <View style={styles.storeLinkRow}>
                  <Text style={styles.storeLinkUrl} numberOfLines={1}>{storeUrl}</Text>
                  <Pressable onPress={() => Linking.openURL(`https://${storeUrl}`)} hitSlop={8}>
                    <ExternalLink size={13} color={Colors.surface[500]} />
                  </Pressable>
                  <Pressable onPress={copyStoreUrl} hitSlop={8}>
                    <Copy size={13} color={Colors.surface[700]} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Today */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TODAY</Text>
          <View style={styles.statsRow}>
            <StatsCard label="Orders"  value={String(data?.todayOrders ?? 0)} accent />
            <StatsCard label="Revenue" value={isLoading ? '—' : fmt(data?.todayRevenue ?? 0)} />
          </View>
        </View>

        {/* All-time */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ALL TIME</Text>
          <View style={styles.statsRow}>
            <StatsCard label="Revenue"  value={isLoading ? '—' : fmt(data?.totalRevenue ?? 0)} />
            <StatsCard label="Orders"   value={String(data?.totalOrders ?? 0)} />
          </View>
          <View style={[styles.statsRow, { marginTop: 10 }]}>
            <StatsCard label="Products" value={String(data?.totalProducts ?? 0)} />
            <StatsCard label="Pending"  value={String(data?.pendingOrders ?? 0)} sub="Need attention" />
          </View>
        </View>

        {/* Revenue chart */}
        <RevenueChart />

        {/* Recent orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <Text style={styles.seeAll} onPress={() => router.push('/(app)/orders')}>See all →</Text>
          </View>

          {isLoading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Loading…</Text>
            </View>
          ) : (data?.recentOrders?.length ?? 0) === 0 ? (
            <View style={[styles.emptyCard, { gap: 8 }]}>
              <Inbox size={32} color={Colors.surface[300]} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>Orders will appear here once customers start buying</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {(data?.recentOrders ?? []).slice(0, 5).map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => router.push(`/(app)/orders/${order.id}`)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface[100],
  },
  header: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 20,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 18,
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: Colors.white,
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkMuted,
  },
  name: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.dark,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  dateBadge: {
    backgroundColor: Colors.darkCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.darkMuted,
  },
  headerAccent: {
    height: 3,
    backgroundColor: Colors.brand,
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  storeLinkCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeCardLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    flexShrink: 0,
  },
  storeCardLogoFallback: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surface[100],
    borderWidth: 1.5,
    borderColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  storeCardInfo: {
    flex: 1,
    gap: 4,
  },
  storeCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.surface[900],
  },
  storeLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeLinkUrl: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.surface[500],
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.surface[400],
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.surface[900],
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.surface[600],
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: Colors.surface[700],
  },
  emptyText: {
    color: Colors.surface[400],
    fontSize: 13,
    textAlign: 'center',
  },
  /* no-store state */
  noStoreSafe: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noStoreTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.surface[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  noStoreSub: {
    fontSize: 14,
    color: Colors.surface[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  noStoreActions: {
    gap: 12,
    width: '100%',
  },
  noStoreCta: {
    textAlign: 'center',
    color: Colors.dark,
    fontWeight: '800',
    fontSize: 15,
    backgroundColor: Colors.brand,
    paddingVertical: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  noStoreRetry: {
    textAlign: 'center',
    color: Colors.surface[500],
    fontSize: 14,
  },
});
