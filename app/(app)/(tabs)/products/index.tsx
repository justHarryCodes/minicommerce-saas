import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, FolderOpen, Package, Plus, Search, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { AppHeader } from '@/components/AppHeader';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Product } from '@/types';

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ])
  );
}

export default function ProductsScreen() {
  const [search, setSearch] = useState('');

  const headerRight = (
    <View style={styles.headerBtns}>
      <Pressable
        onPress={() => router.push('/(app)/categories/index')}
        style={({ pressed }) => [styles.headerBtnGhost, { opacity: pressed ? 0.75 : 1 }]}
      >
        <FolderOpen size={14} color={Colors.darkMuted} />
        <Text style={styles.headerBtnGhostLabel}>Categories</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/(app)/products/new')}
        style={({ pressed }) => [styles.headerBtnPrimary, { opacity: pressed ? 0.75 : 1 }]}
      >
        <Plus size={14} color={Colors.brand} strokeWidth={3} />
        <Text style={styles.headerBtnPrimaryLabel}>Add</Text>
      </Pressable>
    </View>
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const raw = await api.get<unknown>('/api/products?limit=100');
      const arr: Record<string, unknown>[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as Record<string, unknown>)?.data)
          ? (raw as Record<string, unknown>).data as Record<string, unknown>[]
          : [];
      return arr.map(snakeToCamel) as unknown as Product[];
    },
  });

  const filtered = (data ?? []).filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const sections = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    for (const p of filtered) {
      const key = p.categoryName ?? 'Uncategorized';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
      })
      .map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const subtitle = !isLoading
    ? `${data?.length ?? 0} total · ${sections.length} ${sections.length === 1 ? 'category' : 'categories'}`
    : undefined;

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Products" subtitle={subtitle} right={headerRight} />

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={16} color={Colors.surface[400]} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products…"
            placeholderTextColor={Colors.surface[400]}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={16} color={Colors.surface[400]} />
            </Pressable>
          )}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand} />}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        renderSectionHeader={({ section: { title, data: items } }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <Text style={styles.sectionCount}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <Text style={styles.loadingText}>Loading products…</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <AlertTriangle size={28} color="#b45309" style={{ marginBottom: 8 }} />
              <Text style={styles.errorTitle}>Failed to load products</Text>
              <Text style={styles.errorSub}>{(error as Error).message}</Text>
            </View>
          ) : (
            <EmptyState
              icon={<Package size={56} color={Colors.surface[300]} />}
              title="No products yet"
              subtitle="Add your first product to start selling"
              action={{ label: '+ Add Product', onPress: () => router.push('/(app)/products/new') }}
            />
          )
        }
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => router.push(`/(app)/products/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface[100],
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerBtnGhostLabel: {
    color: Colors.darkMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  headerBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerBtnPrimaryLabel: {
    color: Colors.dark,
    fontWeight: '800',
    fontSize: 13,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.surface[200],
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.surface[900],
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: Colors.brand,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.surface[700],
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.surface[400],
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: Colors.surface[400],
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface[700],
    textAlign: 'center',
    marginBottom: 4,
  },
  errorSub: {
    fontSize: 12,
    color: Colors.surface[400],
    textAlign: 'center',
  },
});
