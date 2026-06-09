import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Film, FolderOpen, Home, Package, Plus, Settings, ShoppingBag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

const LEFT_TABS  = ['index', 'orders']    as const;
const RIGHT_TABS = ['products', 'settings'] as const;

const TAB_META: Record<string, {
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}> = {
  index:    { label: 'Home',     Icon: Home },
  orders:   { label: 'Orders',   Icon: Package },
  products: { label: 'Products', Icon: ShoppingBag },
  settings: { label: 'Settings', Icon: Settings },
};

/* Defined outside CustomTabBar so React sees a stable component type */
function TabBtn({
  route,
  activeRoute,
  onNavigate,
}: {
  route: string;
  activeRoute: string;
  onNavigate: (r: string) => void;
}) {
  const meta = TAB_META[route];
  if (!meta) return null;
  const active = activeRoute === route;

  return (
    <Pressable onPress={() => onNavigate(route)} style={tabStyles.btn}>
      {active && <View style={tabStyles.indicator} />}
      <meta.Icon size={22} color={active ? '#111827' : '#6B7280'} />
      <Text style={active ? tabStyles.labelActive : tabStyles.labelInactive}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

const tabStyles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    gap: 3,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.brand,
  },
  labelActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  labelInactive: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
});

function CustomTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const [showFab, setShowFab] = useState(false);
  const activeRoute = state.routes[state.index]?.name ?? '';

  return (
    <>
      <View style={[tabBarStyles.bar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
        {LEFT_TABS.map(r => (
          <TabBtn key={r} route={r} activeRoute={activeRoute} onNavigate={n => navigation.navigate(n)} />
        ))}

        <View style={tabBarStyles.fabWrap}>
          <Pressable
            onPress={() => setShowFab(true)}
            style={({ pressed }) => [tabBarStyles.fab, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Plus size={26} color={Colors.brand} strokeWidth={2.8} />
          </Pressable>
        </View>

        {RIGHT_TABS.map(r => (
          <TabBtn key={r} route={r} activeRoute={activeRoute} onNavigate={n => navigation.navigate(n)} />
        ))}
      </View>

      <Modal
        visible={showFab}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowFab(false)}
      >
        <Pressable
          style={tabBarStyles.backdrop}
          onPress={() => setShowFab(false)}
        >
          <Pressable onPress={() => {}}>
            <View style={[tabBarStyles.sheet, { paddingBottom: Math.max(insets.bottom + 20, 32) }]}>
              <View style={tabBarStyles.pill} />
              <Text style={tabBarStyles.sheetTitle}>ADD NEW</Text>

              <SheetItem
                bg="#FEF3C7"
                icon={<ShoppingBag size={22} color="#92400E" />}
                title="New Product"
                sub="Add an item to your store"
                onPress={() => { setShowFab(false); setTimeout(() => router.push('/(app)/products/new'), 200); }}
              />
              <SheetItem
                bg="#DBEAFE"
                icon={<FolderOpen size={22} color="#1D4ED8" />}
                title="New Category"
                sub="Organise your products"
                onPress={() => { setShowFab(false); setTimeout(() => router.push('/(app)/categories/new'), 200); }}
              />
              <SheetItem
                bg="#FFF1F2"
                icon={<Film size={22} color="#F43F5E" />}
                title="New Reel"
                sub="Upload a product video"
                onPress={() => { setShowFab(false); setTimeout(() => router.push('/(app)/reels/new'), 200); }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SheetItem({
  bg, icon, title, sub, onPress,
}: {
  bg: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [tabBarStyles.sheetItem, { backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF' }]}
    >
      <View style={[tabBarStyles.sheetIcon, { backgroundColor: bg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={tabBarStyles.sheetItemTitle}>{title}</Text>
        <Text style={tabBarStyles.sheetItemSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const tabBarStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  pill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  sheetIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  sheetItemSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="products" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="billing"    options={{ href: null }} />
      <Tabs.Screen name="qrcode"     options={{ href: null }} />
      <Tabs.Screen name="reels"      options={{ href: null }} />
      <Tabs.Screen name="categories" options={{ href: null }} />
    </Tabs>
  );
}
