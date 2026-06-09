import { Alert, Dimensions, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { SubHeader } from '@/components/SubHeader';
import type { Category } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');
const TILE_GAP = 12;
const TILE_PAD = 16;
const TILE_W   = (SCREEN_W - TILE_PAD * 2 - TILE_GAP) / 2;

// Rotating accent colours for tile icons
const ACCENTS = [
  { bg: '#FEF3C7', icon: '#D97706' },
  { bg: '#DBEAFE', icon: '#2563EB' },
  { bg: '#EDE9FE', icon: '#7C3AED' },
  { bg: '#D1FAE5', icon: '#059669' },
  { bg: '#FCE7F3', icon: '#DB2777' },
  { bg: '#FFEDD5', icon: '#EA580C' },
  { bg: '#CCFBF1', icon: '#0D9488' },
  { bg: '#FEE2E2', icon: '#DC2626' },
];

function CategoryTile({
  item,
  index,
  onEdit,
  onDelete,
  onAddSub,
}: {
  item: Category;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const subCount = item.subcategories?.length ?? 0;

  return (
    <View style={[styles.tile, { width: TILE_W }]}>
      {/* Icon */}
      <View style={[styles.tileIcon, { backgroundColor: accent.bg }]}>
        <FolderOpen size={28} color={accent.icon} strokeWidth={1.8} />
      </View>

      {/* Name */}
      <Text style={styles.tileName} numberOfLines={2}>{item.name}</Text>

      {/* Sub count badge */}
      <View style={styles.tileSubRow}>
        {subCount > 0 ? (
          <View style={[styles.subBadge, { backgroundColor: accent.bg }]}>
            <Text style={[styles.subBadgeText, { color: accent.icon }]}>
              {subCount} {subCount === 1 ? 'sub' : 'subs'}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={onAddSub}
            style={({ pressed }) => [styles.addSubBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Plus size={10} color={Colors.brand} strokeWidth={3} />
            <Text style={styles.addSubBtnLabel}>Add sub</Text>
          </Pressable>
        )}
      </View>

      {/* Divider */}
      <View style={styles.tileDivider} />

      {/* Actions */}
      <View style={styles.tileActions}>
        <Pressable
          onPress={onEdit}
          hitSlop={6}
          style={({ pressed }) => [styles.tileActionBtn, styles.editBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Pencil size={13} color={Colors.surface[600]} />
          <Text style={styles.tileActionLabel}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={6}
          style={({ pressed }) => [styles.tileActionBtn, styles.deleteBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Trash2 size={13} color={Colors.error} />
          <Text style={[styles.tileActionLabel, { color: Colors.error }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CategoriesScreen() {
  const qc = useQueryClient();

  const addButton = (
    <Pressable
      onPress={() => router.push('/(app)/categories/new')}
      style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.75 : 1 }]}
    >
      <Plus size={14} color={Colors.brand} strokeWidth={3} />
      <Text style={styles.addBtnLabel}>Add</Text>
    </Pressable>
  );

  const { data, isLoading, refetch, isRefetching } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/api/categories');
      return res.data ?? [];
    },
  });

  const categories = data ?? [];

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError:    (e: Error) => Alert.alert('Error', e.message),
  });

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      'Delete Category',
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel',  style: 'cancel' },
        { text: 'Delete',  style: 'destructive', onPress: () => remove.mutate(id) },
      ],
    );
  }

  const subtitle = !isLoading
    ? `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`
    : undefined;

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <SubHeader title={`Categories${subtitle ? ` · ${subtitle}` : ''}`} right={addButton} />

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FolderOpen size={56} color={Colors.surface[300]} />
          <Text style={styles.emptyTitle}>No categories yet</Text>
          <Text style={styles.emptySub}>
            Group your products into categories so customers can browse more easily.
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/categories/new')}
            style={styles.emptyBtn}
          >
            <Text style={styles.emptyBtnLabel}>+ Add Category</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand} />
          }
          renderItem={({ item, index }) => (
            <CategoryTile
              item={item}
              index={index}
              onEdit={() =>
                router.push({
                  pathname: '/(app)/categories/[id]' as never,
                  params: { id: item.id, name: item.name, parentId: item.parentId ?? '' },
                })
              }
              onDelete={() => confirmDelete(item.id, item.name)}
              onAddSub={() =>
                router.push({
                  pathname: '/(app)/categories/new',
                  params: { parentId: item.id, parentName: item.name },
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[100] },

  addBtn: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addBtnLabel: { color: Colors.brand, fontWeight: '800', fontSize: 13 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.surface[400], fontSize: 14 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.surface[800] },
  emptySub:   { fontSize: 14, color: Colors.surface[500], textAlign: 'center', lineHeight: 20 },
  emptyBtn:   { marginTop: 8, backgroundColor: Colors.brand, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnLabel: { fontWeight: '800', fontSize: 14, color: Colors.dark },

  list: { padding: TILE_PAD, paddingBottom: 32 },
  row:  { gap: TILE_GAP, marginBottom: TILE_GAP },

  /* Tile */
  tile: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    padding: 14,
    gap: 8,
  },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tileName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.surface[900],
    lineHeight: 19,
  },
  tileSubRow: { flexDirection: 'row', alignItems: 'center' },
  subBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  subBadgeText: { fontSize: 11, fontWeight: '700' },
  addSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(233,188,7,0.1)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  addSubBtnLabel: { fontSize: 10, fontWeight: '700', color: Colors.brand },

  tileDivider: {
    height: 1,
    backgroundColor: Colors.surface[100],
    marginVertical: 2,
  },

  tileActions: { flexDirection: 'row', gap: 6 },
  tileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtn:   { backgroundColor: Colors.surface[100] },
  deleteBtn: { backgroundColor: '#FEE2E2' },
  tileActionLabel: { fontSize: 11, fontWeight: '700', color: Colors.surface[600] },
});
