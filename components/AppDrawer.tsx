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
import { Accent, Colors } from "@/constants/theme";
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
  pro?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { Icon: Home, label: "Dashboard", route: "/(app)", matchPath: "/", iconBg: Accent.dashboard.bg, iconColor: Accent.dashboard.fg },
  { Icon: Package, label: "Orders", route: "/(app)/orders", matchPath: "/orders", iconBg: Accent.orders.bg, iconColor: Accent.orders.fg },
  { Icon: ShoppingBag, label: "Products", route: "/(app)/products", matchPath: "/products", iconBg: Accent.products.bg, iconColor: Accent.products.fg },
  { Icon: FolderOpen, label: "Categories", route: "/(app)/categories", matchPath: "/categories", iconBg: Accent.categories.bg, iconColor: Accent.categories.fg },
  { Icon: Film, label: "Reels", route: "/(app)/reels", matchPath: "/reels", iconBg: Accent.reels.bg, iconColor: Accent.reels.fg, pro: true },
  { Icon: CreditCard, label: "Billing", route: "/(app)/billing", matchPath: "/billing", iconBg: Accent.billing.bg, iconColor: Accent.billing.fg },
  { Icon: QrCode, label: "QR Code", route: "/(app)/qrcode", matchPath: "/qrcode", iconBg: Accent.qrcode.bg, iconColor: Accent.qrcode.fg },
  { Icon: Settings, label: "Settings", route: "/(app)/settings", matchPath: "/settings", iconBg: Accent.settings.bg, iconColor: Accent.settings.fg },
];

/* ───────────────── CARD ───────────────── */

function NavCard({
  item,
  onPress,
  pathname,
  locked,
}: {
  item: NavItem;
  onPress: (route: string) => void;
  pathname: string;
  locked: boolean;
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
      {locked && (
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      )}
      <View
        style={[
          styles.icon,
          { backgroundColor: active ? Colors.brand : item.iconBg },
        ]}
      >
        <Icon size={18} color={active ? Colors.dark : item.iconColor} />
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
      ? Colors.success
      : subStatus === "expired"
      ? Colors.error
      : Colors.surface[500];

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
            <X size={18} color={Colors.surface[400]} />
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
                  {store.slug}.dukanigeria.com
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
              locked={!!item.pro && !store?.plan?.isPro}
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
          <LogOut size={16} color={Colors.error} />
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
    backgroundColor: Colors.surface[100],
  },

  header: {
    backgroundColor: Colors.dark,
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
    backgroundColor: Colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  logoText: {
    color: Colors.dark,
    fontWeight: "900",
  },

  brandText: {
    color: Colors.white,
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
    backgroundColor: Colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: Colors.dark,
    fontWeight: "900",
  },

  name: {
    color: Colors.white,
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
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 10,
    alignItems: "center",

    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  proBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: Colors.brandLight,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },

  proBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: Colors.brandDark,
    letterSpacing: 0.3,
  },

  cardActive: {
    borderWidth: 1,
    borderColor: Colors.brand,
    backgroundColor: Colors.brandLight,
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
    color: Colors.surface[700],
    textAlign: "center",
  },

  labelActive: {
    fontWeight: "800",
    color: Colors.surface[900],
  },

  footer: {
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.surface[200],
  },

  logout: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.errorLight,
    padding: 12,
    borderRadius: 12,
  },

  logoutText: {
    color: Colors.error,
    fontWeight: "700",
  },
});