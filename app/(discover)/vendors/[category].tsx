import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, Store } from 'lucide-react-native';
import { API_BASE } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { getCachedVendors, isVendorCacheStale, setCachedVendors } from '@/lib/discover-cache';
import type { DiscoverVendor } from '@/types/discover';

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

export default function CategoryVendors() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const insets = useSafeAreaInsets();
  const [vendors, setVendors] = useState<DiscoverVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = getCachedVendors();
    if (cached.length > 0) {
      setVendors(cached);
      setLoading(false);
    }

    if (isVendorCacheStale()) {
      fetchVendors()
        .then(fresh => { setCachedVendors(fresh); setVendors(fresh); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(
    () => vendors.filter(v => (v.category || 'Other') === (category || 'Other')),
    [vendors, category]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={Colors.dark} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{category}</Text>
        {!loading && (
          <Text style={styles.count}>{filtered.length} vendors</Text>
        )}
      </View>
      <View style={styles.accent} />

      {loading && vendors.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={v => v.store_id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => router.push(`/store/${item.store_slug}`)}
            >
              {item.store_logo ? (
                <Image source={{ uri: item.store_logo }} style={styles.logo} />
              ) : (
                <View style={styles.logoFallback}>
                  <Store size={28} color={Colors.brand} />
                </View>
              )}
              <Text style={styles.storeName} numberOfLines={2}>{item.store_name}</Text>
              <View style={styles.viewsRow}>
                <Eye size={11} color={Colors.darkMuted} />
                <Text style={styles.viewsText}>{fmt(item.total_views)} views</Text>
              </View>
              {item.product_count > 0 && (
                <Text style={styles.productCount}>{item.product_count} products</Text>
              )}
              <View style={styles.exploreBtn}>
                <Text style={styles.exploreBtnLabel}>Explore Store</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No vendors in this category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[100] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: '#fff',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '900', color: Colors.dark, letterSpacing: -0.3 },
  count: { fontSize: 12, color: Colors.surface[500], fontWeight: '600' },
  accent: { height: 3, backgroundColor: Colors.brand },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: Colors.surface[500], fontSize: 14 },

  grid: { padding: 12, paddingBottom: 30 },
  row: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
  logo: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: Colors.brand },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface[100],
    borderWidth: 2.5,
    borderColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: { fontSize: 13, fontWeight: '800', color: Colors.dark, textAlign: 'center' },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText: { fontSize: 11, color: Colors.surface[500] },
  productCount: { fontSize: 11, color: Colors.surface[500], fontWeight: '600' },
  exploreBtn: {
    marginTop: 4,
    backgroundColor: Colors.brand,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  exploreBtnLabel: { fontSize: 11, fontWeight: '800', color: Colors.dark },
});
