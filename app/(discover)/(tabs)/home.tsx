import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  FlatList,
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
import { ChevronRight, ShoppingBag } from 'lucide-react-native';
import { API_BASE } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { ProductCardSkeleton, SectionHeaderSkeleton } from '@/components/Skeleton';
import type { MarketProduct } from '@/types/discover';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../../../assets/logo.png') as number;

const CATEGORY_META: Record<string, { icon: string; accent: string }> = {
  'Fashion and Clothing':    { icon: '👗', accent: '#ec4899' },
  'Shoes and Sneakers':      { icon: '👟', accent: '#f97316' },
  'Bags and Accessories':    { icon: '👜', accent: '#a855f7' },
  'Beauty and Makeup':       { icon: '💄', accent: '#f43f5e' },
  'Hair and Wigs':           { icon: '💇', accent: '#06b6d4' },
  'Food and Catering':       { icon: '🍽️', accent: '#22c55e' },
  'Electronics and Gadgets': { icon: '⚡', accent: '#3b82f6' },
  'Phones and Accessories':  { icon: '📱', accent: '#6366f1' },
  'Laptops and Computing':   { icon: '💻', accent: '#0ea5e9' },
  'Furniture and Home':      { icon: '🛋️', accent: '#84cc16' },
  'Artwork and Paintings':   { icon: '🎨', accent: '#f59e0b' },
  'Jewelry and Watches':     { icon: '💎', accent: '#14b8a6' },
  'Books and Stationery':    { icon: '📚', accent: '#8b5cf6' },
  'Other':                   { icon: '📦', accent: '#71717a' },
};

function fmtPrice(n: number): string {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

async function fetchProducts(): Promise<MarketProduct[]> {
  const res = await fetch(`${API_BASE}/api/mobile/discover?type=products&limit=100`);
  if (!res.ok) throw new Error('Failed to load products');
  const json = await res.json() as { products: MarketProduct[] };
  return json.products ?? [];
}

// ─── Product card inside a horizontal row ─────────────────────────────────────
function ProductCard({ item, accent }: { item: MarketProduct; accent: string }) {
  const icon = CATEGORY_META[item.store_category ?? 'Other']?.icon ?? '📦';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() =>
        router.push(`/store/${item.store_slug}` as Parameters<typeof router.push>[0])
      }
    >
      {/* Product image */}
      <View style={styles.cardImageWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: accent + '18' }]}>
            <Text style={styles.cardImagePlaceholderIcon}>{icon}</Text>
          </View>
        )}
        {/* Sale ribbon */}
        {item.compare_price != null && item.compare_price > item.price && (
          <View style={styles.saleTag}>
            <Text style={styles.saleTagText}>SALE</Text>
          </View>
        )}
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>
          {item.product_name}
        </Text>

        {/* Price */}
        <View style={styles.cardPriceRow}>
          <Text style={styles.cardPrice}>{fmtPrice(item.price)}</Text>
          {item.compare_price != null && item.compare_price > item.price && (
            <Text style={styles.cardOldPrice}>{fmtPrice(item.compare_price)}</Text>
          )}
        </View>

        {/* Store badge */}
        <View style={styles.cardStoreBadge}>
          {item.store_logo ? (
            <Image source={{ uri: item.store_logo }} style={styles.cardStoreLogo} />
          ) : (
            <View style={[styles.cardStoreLogoFallback, { backgroundColor: accent }]}>
              <Text style={styles.cardStoreLogoLetter}>
                {item.store_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.cardStoreName} numberOfLines={1}>
            {item.store_name}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── One category section ─────────────────────────────────────────────────────
function CategorySection({ name, items }: { name: string; items: MarketProduct[] }) {
  const meta = CATEGORY_META[name] ?? CATEGORY_META['Other'];

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: meta.accent + '18' }]}>
          <Text style={styles.sectionIcon}>{meta.icon}</Text>
        </View>
        <Text style={styles.sectionTitle} numberOfLines={1}>{name}</Text>
        <Pressable
          style={({ pressed }) => [styles.viewAllBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() =>
            router.push(
              `/(discover)/products/${encodeURIComponent(name)}` as Parameters<typeof router.push>[0]
            )
          }
        >
          <Text style={styles.viewAllText}>View all</Text>
          <ChevronRight size={14} color={meta.accent} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Horizontal scroll of product cards */}
      <FlatList
        data={items.slice(0, 10)}
        keyExtractor={p => p.product_id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardRow}
        renderItem={({ item }) => <ProductCard item={item} accent={meta.accent} />}
      />

      {/* Bottom divider */}
      <View style={styles.sectionDivider} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setProducts(await fetchProducts());
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by store_category, ordered by count descending
  const sections = useMemo(() => {
    const map = new Map<string, MarketProduct[]>();
    for (const p of products) {
      const cat = p.store_category || 'Other';
      if (cat === 'Uncategorized') continue;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [products]);

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor="#f97316" barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerTop}>
          <Image source={logo} style={styles.headerLogo} contentFit="contain" />
          <Pressable
            style={({ pressed }) => [styles.signInBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push('/(auth)/login' as Parameters<typeof router.push>[0])}
          >
            <Text style={styles.signInLabel}>Sign in</Text>
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSub}>Products &amp; connect with vendors</Text>
      </View>

      {/* ── Content ────────────────────────────────────────────────── */}
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {Array.from({ length: 3 }).map((_, si) => (
            <View key={si} style={styles.section}>
              <SectionHeaderSkeleton />
              <FlatList
                data={Array.from({ length: 5 })}
                keyExtractor={(_, i) => String(i)}
                horizontal
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardRow}
                renderItem={() => <ProductCardSkeleton />}
              />
              <View style={styles.sectionDivider} />
            </View>
          ))}
        </ScrollView>
      ) : sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ShoppingBag size={52} color={Colors.surface[300]} />
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptyBody}>
            Vendors are adding products — check back soon
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              colors={[Colors.brand]}
              tintColor={Colors.brand}
            />
          }
        >
          {sections.map(sec => (
            <CategorySection key={sec.name} name={sec.name} items={sec.items} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Card dimensions ──────────────────────────────────────────────────────────
const CARD_W = 148;
const CARD_IMG_H = 148;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // Header
  header: {
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.12)',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.65)',
    fontWeight: '500',
    marginTop: 4,
  },
  signInBtn: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexShrink: 0,
  },
  signInLabel: { fontSize: 13, fontWeight: '800', color: '#000' },

  // States
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Colors.dark, marginTop: 12 },
  emptyBody: { fontSize: 13, color: Colors.surface[500], textAlign: 'center', lineHeight: 20 },

  // Section
  section: { backgroundColor: '#fff' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 8,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionIcon: { fontSize: 16 },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: Colors.dark,
    letterSpacing: -0.2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingLeft: 4,
    flexShrink: 0,
  },
  viewAllText: { fontSize: 12, fontWeight: '700', color: Colors.brand },
  sectionDivider: {
    height: 8,
    backgroundColor: Colors.surface[50],
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surface[100],
  },

  // Horizontal card row
  cardRow: { paddingHorizontal: 16, gap: 10 },

  // Product card
  card: {
    width: CARD_W,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    overflow: 'hidden',
  },
  cardImageWrap: {
    width: CARD_W,
    height: CARD_IMG_H,
    position: 'relative',
    backgroundColor: Colors.surface[100],
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderIcon: { fontSize: 34 },
  saleTag: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: '#ef4444',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  saleTagText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 0.6 },

  cardBody: { padding: 9, gap: 4 },
  cardName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 15,
    minHeight: 30,
  },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardPrice: { fontSize: 13, fontWeight: '900', color: Colors.dark, letterSpacing: -0.2 },
  cardOldPrice: {
    fontSize: 10,
    color: Colors.surface[400],
    textDecorationLine: 'line-through',
  },
  cardStoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  cardStoreLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
  cardStoreLogoFallback: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStoreLogoLetter: { fontSize: 7, color: '#fff', fontWeight: '900' },
  cardStoreName: { fontSize: 10, color: Colors.surface[500], fontWeight: '600', flex: 1 },
});
