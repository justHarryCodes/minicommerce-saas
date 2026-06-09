import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CreditCard,
  Film,
  FolderOpen,
  Home,
  LogOut,
  Package,
  QrCode,
  Settings,
  ShoppingBag,
  X,
} from "lucide-react-native";
import { signOut } from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth";
import type { Store } from "@/types";

/* card width for 4-column grid */
const DRAWER_W     = Math.min(Dimensions.get("window").width * 0.85, 340);
const SCROLL_PAD   = 14;
const COL_GAP      = 8;
const CARD_W       = Math.floor((DRAWER_W - SCROLL_PAD * 2 - COL_GAP * 3) / 4);

/* ───────────────── NAV ITEMS ───────────────── */

interface NavItem {
  Icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  route: string;
  matchPath: string;
  iconBg: string;
  iconColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { Icon: Home, label: "Dashboard", route: "/(app)", matchPath: "/", iconBg: "#EFF6FF", iconColor: "#3B82F6" },
  { Icon: Package, label: "Orders", route: "/(app)/orders", matchPath: "/orders", iconBg: "#F5F3FF", iconColor: "#8B5CF6" },
  { Icon: ShoppingBag, label: "Products", route: "/(app)/products", matchPath: "/products", iconBg: "#F0FDF4", iconColor: "#22C55E" },
  { Icon: FolderOpen, label: "Categories", route: "/(app)/categories", matchPath: "/categories", iconBg: "#FFF7ED", iconColor: "#F97316" },
  { Icon: Film, label: "Reels", route: "/(app)/reels", matchPath: "/reels", iconBg: "#FFF1F2", iconColor: "#F43F5E" },
  { Icon: CreditCard, label: "Billing", route: "/(app)/billing", matchPath: "/billing", iconBg: "#ECFDF5", iconColor: "#10B981" },
  { Icon: QrCode, label: "QR Code", route: "/(app)/qrcode", matchPath: "/qrcode", iconBg: "#EEF2FF", iconColor: "#6366F1" },
  { Icon: Settings, label: "Settings", route: "/(app)/settings", matchPath: "/settings", iconBg: "#F8FAFC", iconColor: "#64748B" },
];

/* ───────────────── CARD ───────────────── */

function NavCard({
  item,
  onPress,
  pathname,
}: {
  item: NavItem;
  onPress: (route: string) => void;
  pathname: string;
}) {
  const active =
    pathname === item.matchPath ||
    (item.matchPath !== "/" && pathname.startsWith(item.matchPath));

  const { Icon } = item;

  return (
    <Pressable
      onPress={() => onPress(item.route)}
      style={({ pressed }) => [
        styles.card,
        active && styles.cardActive,
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: active ? "#6366F1" : item.iconBg },
        ]}
      >
        <Icon size={18} color={active ? "#fff" : item.iconColor} />
      </View>

      <Text style={[styles.label, active && styles.labelActive]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

/* ───────────────── DRAWER ───────────────── */

export function DrawerContent({
  navigation,
}: {
  navigation: { closeDrawer(): void };
}) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const { data: store } = useQuery<Store>({
    queryKey: ["store"],
    queryFn: () => api.get<Store>("/api/dashboard/store"),
  });

  const initials =
    (user?.displayName ?? user?.email ?? "?")[0].toUpperCase();

  const subStatus = store?.subscriptionStatus;

  const subColor =
    subStatus === "subscribed"
      ? "#22C55E"
      : subStatus === "expired"
      ? "#EF4444"
      : "#64748B";

  const subLabel =
    subStatus === "subscribed"
      ? "Active"
      : subStatus === "expired"
      ? "Expired"
      : "Inactive";

  function go(route: string) {
    navigation.closeDrawer();
    setTimeout(() => router.navigate(route as never), 120);
  }

  function handleSignOut() {
    navigation.closeDrawer();
    setTimeout(() => {
      Alert.alert("Sign out", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace("/(auth)/login");
            } catch {
              Toast.show({
                type: "error",
                text1: "Sign out failed",
              });
            }
          },
        },
      ]);
    }, 150);
  }

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>D</Text>
            </View>
            <Text style={styles.brandText}>Duka Vendors</Text>
          </View>

          <Pressable onPress={() => navigation.closeDrawer()}>
            <X size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {/* PROFILE */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {user?.displayName ?? "Vendor"}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>

            {store && (
              <View style={styles.meta}>
                <Text style={styles.store}>
                  {store.slug}.awarizon.shop
                </Text>

                <View
                  style={[
                    styles.dot,
                    { backgroundColor: subColor },
                  ]}
                />

                <Text style={[styles.status, { color: subColor }]}>
                  {subLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* GRID (2x4 Facebook style) */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {NAV_ITEMS.map((item) => (
            <NavCard
              key={item.route}
              item={item}
              onPress={go}
              pathname={pathname}
            />
          ))}
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 10 },
        ]}
      >
        <Pressable onPress={handleSignOut} style={styles.logout}>
          <LogOut size={16} color="#EF4444" />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ───────────────── STYLES ───────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  header: {
    backgroundColor: "#0B1220",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },

  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },

  logoText: {
    color: "#fff",
    fontWeight: "900",
  },

  brandText: {
    color: "#fff",
    fontWeight: "800",
  },

  profile: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 12,
    borderRadius: 14,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#fff",
    fontWeight: "900",
  },

  name: {
    color: "#fff",
    fontWeight: "700",
  },

  email: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },

  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },

  store: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  status: {
    fontSize: 11,
    fontWeight: "600",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: COL_GAP,
  },

  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardActive: {
    borderWidth: 1,
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },

  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },

  labelActive: {
    fontWeight: "800",
    color: "#111827",
  },

  footer: {
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  logout: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 12,
  },

  logoutText: {
    color: "#EF4444",
    fontWeight: "700",
  },
});