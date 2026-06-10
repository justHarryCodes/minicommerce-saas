import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ShoppingBag } from 'lucide-react-native';
import { API_BASE } from '@/lib/api';
import { Colors } from '@/constants/theme';
import type { MarketProduct } from '@/types/discover';

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

function fmtPrice(n: number): string {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

const PAGE_SIZE = 40;

async function fetchCategoryProducts(
  category: string,
  page: number
): Promise<{ products: MarketProduct[]; total: number }> {
  const params = new URLSearchParams({
    category,
    limit: String(PAGE_SIZE),
    page: String(page),
  });
  const res = await fetch(`${API_BASE}/api/discover/products?${params.toString()}`);
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  const json = await res.json() as { products: MarketProduct[]; total: number };
  return { products: json.products ?? [], total: json.total ?? 0 };
}

function ProductGridCard({ item }: { item: MarketProduct }) {
  const catIcon = CATEGORY_META[item.store_category ?? 'Other']?.icon ?? '📦';
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.88 : 1 }]}
      onPress={() =>
        router.push(`/store/${item.store_slug}` as Parameters<typeof router.push>[0])
      }
    >
      {/* Image */}
      <View style={styles.imageWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackIcon}>{catIcon}</Text>
          </View>
        )}
        {item.compare_price && item.compare_price > item.price && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleBadgeText}>SALE</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product_name}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{fmtPrice(item.price)}</Text>
          {item.compare_price && item.compare_price > item.price && (
            <Text style={styles.comparePrice}>{fmtPrice(item.compare_price)}</Text>
          )}
        </View>

        {/* Store link */}
        <Pressable
          style={styles.storeRow}
          onPress={() =>
            router.push(`/store/${item.store_slug}` as Parameters<typeof router.push>[0])
          }
          hitSlop={8}
        >
          {item.store_logo ? (
            <Image source={{ uri: item.store_logo }} style={styles.storeLogo} />
          ) : (
            <View style={styles.storeLogoFallback}>
              <Text style={styles.storeLogoLetter}>
                {item.store_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.storeName} numberOfLines={1}>
            {item.store_name}
          </Text>
        </Pressable>

        <View style={styles.buyBtn}>
          <Text style={styles.buyBtnText}>Visit Store →</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function CategoryProducts() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decodedCat = category ? decodeURIComponent(category) : '';
  const icon = CATEGORY_META[decodedCat]?.icon ?? '📦';

  const load = useCallback(async (pageNum: number, replace: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const { products: fresh, total: t } = await fetchCategoryProducts(decodedCat, pageNum);
      setProducts(prev => replace ? fresh : [...prev, ...fresh]);
      setTotal(t);
      setPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [decodedCat]);

  useEffect(() => { load(1, true); }, [load]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading) return;
    if (products.length >= total) return;
    load(page + 1, false);
  }, [loadingMore, loading, products.length, total, page, load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ArrowLeft size={22} color={Colors.dark} />
        </Pressable>

        <Text style={styles.headerIcon}>{icon}</Text>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {decodedCat}
        </Text>

        {!loading && (
          <Text style={styles.headerCount}>{total} products</Text>
        )}
      </View>
      <View style={styles.accent} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} size="large" />
          <Text style={styles.loadingText}>Loading products…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load(1, true)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={p => p.product_id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => <ProductGridCard item={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <ShoppingBag size={48} color={Colors.surface[300]} />
              <Text style={styles.emptyTitle}>No products in this category</Text>
              <Text style={styles.emptyBody}>Check back later — vendors are listing items</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreCenter}>
                <ActivityIndicator color={Colors.brand} size="small" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[50] },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerIcon: { fontSize: 20 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: Colors.dark,
    letterSpacing: -0.3,
  },
  headerCount: { fontSize: 12, color: Colors.surface[500], fontWeight: '600' },
  accent: { height: 3, backgroundColor: Colors.brand },

  // States
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    gap: 10,
  },
  loadingText: { color: Colors.surface[500], fontSize: 14, marginTop: 8 },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: Colors.dark },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark, marginTop: 12 },
  emptyBody: {
    fontSize: 13,
    color: Colors.surface[500],
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loadMoreCenter: { paddingVertical: 20, alignItems: 'center' },

  // Grid
  grid: { padding: 12, paddingBottom: 32 },
  row: { gap: 10 },

  // Product card (2-col grid)
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    overflow: 'hidden',
    marginBottom: 10,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surface[100],
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackIcon: { fontSize: 40 },
  saleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saleBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  cardBody: { padding: 10, gap: 5 },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 16,
    minHeight: 32,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 14, fontWeight: '900', color: Colors.dark, letterSpacing: -0.3 },
  comparePrice: {
    fontSize: 10,
    color: Colors.surface[400],
    textDecorationLine: 'line-through',
  },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  storeLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
  storeLogoFallback: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeLogoLetter: { fontSize: 8, color: Colors.dark, fontWeight: '900' },
  storeName: { fontSize: 10, color: Colors.surface[500], fontWeight: '600', flex: 1 },
  buyBtn: {
    marginTop: 4,
    backgroundColor: Colors.brand,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  buyBtnText: { fontSize: 11, fontWeight: '800', color: Colors.dark },
});
