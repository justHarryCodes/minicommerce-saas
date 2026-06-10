import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { ChevronRight, Eye, Globe, Store } from 'lucide-react-native';
import { API_BASE } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { getCachedVendors, isVendorCacheStale, setCachedVendors } from '@/lib/discover-cache';
import { SectionHeaderSkeleton, StoryRingSkeleton, VendorCardSkeleton } from '@/components/Skeleton';
import type { DiscoverVendor } from '@/types/discover';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../../../assets/logo.png') as number;

const CATEGORY_META: Record<string, { icon: string }> = {
  'Fashion and Clothing':    { icon: '👗' },
  'Shoes and Sneakers':      { icon: '👟' },
  'Bags and Accessories':    { icon: '👜' },
  'Beauty and Makeup':       { icon: '💄' },
  'Hair and Wigs':           { icon: '💇' },
  'Food and Catering':       { icon: '🍽️' },
  'Electronics and Gadgets': { icon: '⚡' },
  'Phones and Accessories':  { icon: '📱' },
  'Laptops and Computing':   { icon: '💻' },
  'Furniture and Home':      { icon: '🛋️' },
  'Artwork and Paintings':   { icon: '🎨' },
  'Jewelry and Watches':     { icon: '💎' },
  'Books and Stationery':    { icon: '📚' },
  'Other':                   { icon: '📦' },
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

async function fetchVendors(): Promise<DiscoverVendor[]> {
  const res = await fetch(`${API_BASE}/api/discover/vendors`);
  if (!res.ok) throw new Error(`Vendors fetch failed (${res.status})`);
  const json = await res.json() as { vendors: DiscoverVendor[] };
  return json.vendors ?? [];
}

function VendorCard({ vendor }: { vendor: DiscoverVendor }) {
  const icon = CATEGORY_META[vendor.category]?.icon ?? '📦';
  return (
    <View style={styles.vendorCard}>
      {vendor.store_logo ? (
        <Image source={{ uri: vendor.store_logo }} style={styles.vendorLogo} />
      ) : (
        <View style={styles.vendorLogoFallback}>
          <Store size={24} color={Colors.brand} />
        </View>
      )}
      <Text style={styles.vendorName} numberOfLines={1}>{vendor.store_name}</Text>
      <View style={styles.catBadge}>
        <Text style={styles.catBadgeIcon}>{icon}</Text>
        <Text style={styles.catBadgeText} numberOfLines={1}>{vendor.category}</Text>
      </View>
      <View style={styles.viewRow}>
        <Eye size={10} color={Colors.darkMuted} />
        <Text style={styles.viewText}>{fmt(vendor.total_views)} views</Text>
        {vendor.product_count > 0 && (
          <Text style={styles.viewText}>· {vendor.product_count} items</Text>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [styles.exploreBtn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => router.push(`/store/${vendor.store_slug}` as Parameters<typeof router.push>[0])}
      >
        <Text style={styles.exploreBtnLabel}>Explore</Text>
        <ChevronRight size={12} color={Colors.dark} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.webLink, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => WebBrowser.openBrowserAsync(`https://${vendor.store_slug}.awarizon.shop`)}
      >
        <Globe size={10} color={Colors.surface[400]} />
        <Text style={styles.webLinkText} numberOfLines={1}>
          {vendor.store_slug}.awarizon.shop
        </Text>
      </Pressable>
    </View>
  );
}

export default function DiscoverVendors() {
  const insets = useSafeAreaInsets();
  const [vendors, setVendors] = useState<DiscoverVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function loadVendors(force = false) {
    const cached = getCachedVendors();
    if (cached.length > 0 && !force) {
      setVendors(cached);
      setLoading(false);
    }
    if (force || isVendorCacheStale()) {
      fetchVendors()
        .then(fresh => { setCachedVendors(fresh); setVendors(fresh); })
        .catch(() => {})
        .finally(() => { setLoading(false); setRefreshing(false); });
    } else {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadVendors(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hotVendors = useMemo(
    () => [...vendors].sort((a, b) => b.total_views - a.total_views).slice(0, 12),
    [vendors]
  );

  const categorySections = useMemo(() => {
    const map = new Map<string, DiscoverVendor[]>();
    for (const v of vendors) {
      const cat = v.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(v);
    }
    return Array.from(map.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [vendors]);

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Image source={logo} style={styles.headerLogo} contentFit="contain" />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Discover Stores</Text>
            <Text style={styles.headerSub}>
              {vendors.length > 0 ? `${vendors.length} active vendors` : 'Find vendors on Duka'}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(auth)/login' as Parameters<typeof router.push>[0])}
            style={({ pressed }) => [styles.signInBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.signInLabel}>Sign in</Text>
          </Pressable>
        </View>
        <View style={styles.accent} />
      </View>

      {loading && vendors.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Story ring skeletons */}
          <View style={styles.storiesBlock}>
            <View style={{ width: 80, height: 9, backgroundColor: '#CBD5E1', borderRadius: 4, marginHorizontal: 16, marginBottom: 14, opacity: 0.5 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesList} scrollEnabled={false}>
              {Array.from({ length: 6 }).map((_, i) => <StoryRingSkeleton key={i} />)}
            </ScrollView>
          </View>
          <View style={styles.divider} />
          {/* Vendor card section skeletons */}
          {Array.from({ length: 2 }).map((_, si) => (
            <View key={si} style={styles.catSection}>
              <SectionHeaderSkeleton />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vendorRow} scrollEnabled={false}>
                {Array.from({ length: 4 }).map((_, i) => <VendorCardSkeleton key={i} />)}
              </ScrollView>
              <View style={styles.catDivider} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadVendors(true); }}
              colors={[Colors.brand]}
              tintColor={Colors.brand}
            />
          }
        >
          {/* Hot vendors — story rings */}
          {hotVendors.length > 0 && (
            <View style={styles.storiesBlock}>
              <Text style={styles.storiesLabel}>HOT VENDORS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesList}
              >
                {hotVendors.map(v => (
                  <Pressable
                    key={v.store_id}
                    style={({ pressed }) => [styles.storyItem, { opacity: pressed ? 0.8 : 1 }]}
                    onPress={() =>
                      router.push(`/store/${v.store_slug}` as Parameters<typeof router.push>[0])
                    }
                  >
                    <View style={styles.storyRing}>
                      {v.store_logo ? (
                        <Image source={{ uri: v.store_logo }} style={styles.storyAvatar} />
                      ) : (
                        <View style={styles.storyAvatarFallback}>
                          <Store size={18} color={Colors.brand} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.storyName} numberOfLines={1}>{v.store_name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Divider */}
          {hotVendors.length > 0 && <View style={styles.divider} />}

          {/* Category sections — vendor cards */}
          {categorySections.map(sec => {
            const icon = CATEGORY_META[sec.name]?.icon ?? '📦';
            return (
              <View key={sec.name} style={styles.catSection}>
                <View style={styles.catSectionHeader}>
                  <Text style={styles.catSectionTitle}>{icon}  {sec.name}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.viewMoreBtn, { opacity: pressed ? 0.7 : 1 }]}
                    onPress={() =>
                      router.push(
                        `/vendors/${encodeURIComponent(sec.name)}` as Parameters<typeof router.push>[0]
                      )
                    }
                  >
                    <Text style={styles.viewMoreLabel}>View all</Text>
                    <ChevronRight size={14} color={Colors.brand} />
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.vendorRow}
                >
                  {sec.items.slice(0, 8).map(v => (
                    <VendorCard key={v.store_id} vendor={v} />
                  ))}
                </ScrollView>
                <View style={styles.catDivider} />
              </View>
            );
          })}

          {vendors.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Store size={44} color={Colors.surface[300]} />
              <Text style={styles.emptyTitle}>No vendors yet</Text>
              <Text style={styles.emptyBody}>Check back soon — stores are being set up</Text>
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: { backgroundColor: '#fff', paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, gap: 10 },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.surface[100],
    borderWidth: 1,
    borderColor: Colors.surface[200],
    flexShrink: 0,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: Colors.dark, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: Colors.surface[500], fontWeight: '500' },
  signInBtn: { backgroundColor: Colors.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  signInLabel: { fontSize: 13, fontWeight: '800', color: Colors.dark },
  accent: { height: 3, backgroundColor: Colors.brand },

  scrollContent: { paddingTop: 4 },
  divider: { height: 8, backgroundColor: Colors.surface[50], borderTopWidth: 1, borderTopColor: Colors.surface[100] },

  // Story rings
  storiesBlock: { paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff' },
  storiesLabel: {
    fontSize: 9, fontWeight: '800', color: Colors.surface[400],
    letterSpacing: 1.2, paddingHorizontal: 16, marginBottom: 12,
  },
  storiesList: { paddingHorizontal: 16, gap: 16 },
  storyItem: { alignItems: 'center', width: 68 },
  storyRing: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.brand, padding: 2.5, marginBottom: 5,
  },
  storyAvatar: { width: 63, height: 63, borderRadius: 31.5 },
  storyAvatarFallback: {
    width: 63, height: 63, borderRadius: 31.5,
    backgroundColor: Colors.surface[100], alignItems: 'center', justifyContent: 'center',
  },
  storyName: { fontSize: 10, color: Colors.dark, fontWeight: '700', textAlign: 'center' },

  // Category section
  catSection: { backgroundColor: '#fff', paddingTop: 20 },
  catSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12,
  },
  catSectionTitle: { fontSize: 15, fontWeight: '900', color: Colors.dark, letterSpacing: -0.2, flex: 1 },
  viewMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewMoreLabel: { fontSize: 12, fontWeight: '700', color: Colors.brand },
  catDivider: { height: 8, backgroundColor: Colors.surface[50], marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.surface[100] },

  // Vendor card
  vendorRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  vendorCard: {
    width: 148,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surface[200],
    gap: 5,
  },
  vendorLogo: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.brand },
  vendorLogoFallback: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.surface[100], borderWidth: 2, borderColor: Colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  vendorName: { fontSize: 12, fontWeight: '800', color: Colors.dark, textAlign: 'center', maxWidth: 120 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(233,188,7,0.12)', borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  catBadgeIcon: { fontSize: 10 },
  catBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.brandDark, maxWidth: 100 },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewText: { fontSize: 10, color: Colors.surface[500] },
  exploreBtn: {
    marginTop: 3,
    backgroundColor: Colors.brand,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  exploreBtnLabel: { fontSize: 11, fontWeight: '800', color: Colors.dark },
  webLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  webLinkText: { fontSize: 9, color: Colors.surface[400], maxWidth: 118 },

  // Empty
  emptyState: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark, marginTop: 8 },
  emptyBody: { fontSize: 13, color: Colors.surface[500], textAlign: 'center', paddingHorizontal: 32 },
});
