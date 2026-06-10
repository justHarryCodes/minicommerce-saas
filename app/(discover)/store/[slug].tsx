import { useEffect, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, Globe, Package, Store } from 'lucide-react-native';
import { API_BASE } from '@/lib/api';
import { Colors } from '@/constants/theme';
import type { DiscoverStore } from '@/types/discover';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function StoreDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<DiscoverStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/api/discover/stores/${slug}`)
      .then(r => r.json())
      .then((json: { store?: DiscoverStore }) => {
        if (json.store) setStore(json.store);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={Colors.dark} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {store?.store_name ?? 'Store'}
        </Text>
      </View>
      <View style={styles.accent} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} size="large" />
        </View>
      ) : error || !store ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Store not found</Text>
          <Pressable
            style={({ pressed }) => [styles.backLink, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkLabel}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={store.products.slice(0, 10)}
          numColumns={2}
          keyExtractor={p => p.product_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.productRow}
          ListHeaderComponent={
            <View style={styles.storeHeader}>
              {store.store_logo ? (
                <Image source={{ uri: store.store_logo }} style={styles.storeLogo} />
              ) : (
                <View style={styles.storeLogoFallback}>
                  <Store size={36} color={Colors.brand} />
                </View>
              )}
              <Text style={styles.storeName}>{store.store_name}</Text>
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{store.category}</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Eye size={14} color={Colors.darkMuted} />
                  <Text style={styles.statText}>{fmt(store.total_views)} views</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Package size={14} color={Colors.darkMuted} />
                  <Text style={styles.statText}>{store.product_count} products</Text>
                </View>
              </View>
              {!!store.description && (
                <Text style={styles.description}>{store.description}</Text>
              )}
              <Pressable
                style={({ pressed }) => [styles.visitStoreBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => WebBrowser.openBrowserAsync(`https://${store.store_slug}.awarizon.shop`)}
              >
                <Globe size={15} color={Colors.dark} />
                <Text style={styles.visitStoreBtnLabel}>Visit Store</Text>
              </Pressable>
              <View style={styles.sectionDivider} />
              <Text style={styles.productsLabel}>PRODUCTS</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.productImg} />
              ) : (
                <View style={styles.productImgFallback}>
                  <Package size={22} color={Colors.darkMuted} />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>₦{item.price.toLocaleString()}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyText}>No products listed yet</Text>
            </View>
          }
          ListFooterComponent={
            store.products.length > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.viewMoreProducts, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => WebBrowser.openBrowserAsync(`https://${store.store_slug}.awarizon.shop`)}
              >
                <Globe size={14} color={Colors.dark} />
                <Text style={styles.viewMoreProductsLabel}>View More Products</Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[100] },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: '#fff',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: Colors.dark, letterSpacing: -0.3 },
  accent: { height: 3, backgroundColor: Colors.brand },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { color: Colors.surface[500], fontSize: 15 },
  backLink: {
    backgroundColor: Colors.brand,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backLinkLabel: { fontSize: 13, fontWeight: '800', color: Colors.dark },

  listContent: { paddingBottom: 30 },

  storeHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  storeLogo: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.brand },
  storeLogoFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.surface[100],
    borderWidth: 3,
    borderColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.dark,
    marginTop: 14,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  catBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(233,188,7,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.brandDark },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12, color: Colors.surface[500], fontWeight: '600' },
  statDivider: { width: 1, height: 14, backgroundColor: Colors.surface[300] },
  description: {
    marginTop: 14,
    fontSize: 13,
    color: Colors.surface[600],
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.surface[200],
    marginTop: 20,
    alignSelf: 'stretch',
  },
  productsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.surface[400],
    letterSpacing: 1.2,
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
  },

  productRow: { gap: 12, paddingHorizontal: 12, marginTop: 12 },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
  productImg: { width: '100%', aspectRatio: 1 },
  productImgFallback: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surface[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { padding: 10, gap: 4 },
  productName: { fontSize: 12, fontWeight: '700', color: Colors.dark },
  productPrice: { fontSize: 13, fontWeight: '800', color: Colors.brand },

  visitStoreBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.brand,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  visitStoreBtnLabel: { fontSize: 13, fontWeight: '800', color: Colors.dark },

  viewMoreProducts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: Colors.surface[100],
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
  viewMoreProductsLabel: { fontSize: 13, fontWeight: '800', color: Colors.dark },

  emptyProducts: { paddingTop: 32, alignItems: 'center' },
  emptyText: { color: Colors.surface[500], fontSize: 14 },
});
