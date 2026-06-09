import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Film, Plus, Trash2 } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { SubHeader } from '@/components/SubHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Reel } from '@/types/reels';

function duration(secs: number | null) {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ReelsScreen() {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery<{ reels: Reel[]; monthlyUsed: number; monthlyLimit: number }>({
    queryKey: ['reels'],
    queryFn: async () => {
      const res = await api.get('/api/reels');
      return res as { reels: Reel[]; monthlyUsed: number; monthlyLimit: number };
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/reels/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reels'] }),
    onError:   (e: Error) => Toast.show({ type: 'error', text1: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/reels/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reels'] });
      Toast.show({ type: 'success', text1: 'Reel deleted' });
    },
    onError: (e: Error) => Toast.show({ type: 'error', text1: e.message }),
  });

  function confirmDelete(id: string) {
    Alert.alert('Delete reel', 'This will permanently delete the video. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);
  }

  const reels = data?.reels ?? [];
  const used  = data?.monthlyUsed ?? 0;
  const limit = data?.monthlyLimit ?? 20;
  const pct   = Math.min((used / limit) * 100, 100);

  const uploadButton = (
    <Pressable
      onPress={() => router.push('/(app)/reels/new')}
      disabled={used >= limit}
      style={({ pressed }) => [styles.uploadBtn, { opacity: used >= limit ? 0.4 : pressed ? 0.75 : 1 }]}
    >
      <Plus size={14} color={Colors.brand} strokeWidth={3} />
      <Text style={styles.uploadBtnLabel}>Upload</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <SubHeader title="Reels" right={uploadButton} />

      {/* Monthly quota bar */}
      <View style={styles.quotaWrap}>
        <View style={styles.quotaLabelRow}>
          <Text style={styles.quotaLabel}>{used}/{limit} uploads this month</Text>
          {used >= limit && <Text style={styles.quotaLimitReached}>Limit reached</Text>}
        </View>
        <View style={styles.quotaTrack}>
          <View style={[styles.quotaFill, { width: `${pct}%`, backgroundColor: used >= limit ? Colors.error : Colors.brand }]} />
        </View>
      </View>

      <FlatList
        data={reels}
        keyExtractor={r => r.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : (
            <EmptyState
              icon={<Film size={56} color={Colors.surface[300]} />}
              title="No reels yet"
              subtitle="Upload short videos to showcase your products and attract more customers."
              action={{ label: '+ Upload reel', onPress: () => router.push('/(app)/reels/new') }}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.reelCard}>
            {item.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} style={styles.reelThumb} resizeMode="cover" />
            ) : (
              <View style={styles.reelThumbPlaceholder}>
                <Film size={32} color={Colors.surface[500]} />
              </View>
            )}

            {item.duration_seconds ? (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{duration(item.duration_seconds)}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => toggleActive.mutate({ id: item.id, isActive: !item.is_active })}
              style={[styles.liveBadge, { backgroundColor: item.is_active ? Colors.brand : 'rgba(0,0,0,0.6)' }]}
            >
              <Text style={[styles.liveBadgeText, { color: item.is_active ? Colors.dark : '#fff' }]}>
                {item.is_active ? 'LIVE' : 'HIDDEN'}
              </Text>
            </Pressable>

            <View style={styles.reelInfo}>
              {item.title ? (
                <Text style={styles.reelTitle} numberOfLines={1}>{item.title}</Text>
              ) : null}
              <View style={styles.reelMeta}>
                <Text style={styles.reelProducts}>
                  {item.products.length} product{item.products.length !== 1 ? 's' : ''}
                </Text>
                <Pressable onPress={() => confirmDelete(item.id)} hitSlop={8}>
                  <Trash2 size={18} color={Colors.error} />
                </Pressable>
              </View>
            </View>
          </View>
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
  uploadBtn: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  uploadBtnLabel: {
    color: Colors.brand,
    fontWeight: '800',
    fontSize: 13,
  },
  quotaWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  quotaLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quotaLabel: {
    fontSize: 11,
    color: Colors.surface[400],
    fontWeight: '600',
  },
  quotaLimitReached: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
  },
  quotaTrack: {
    height: 4,
    backgroundColor: Colors.surface[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  quotaFill: {
    height: 4,
    borderRadius: 2,
  },
  list: {
    padding: 12,
    gap: 10,
    flexGrow: 1,
  },
  columnWrapper: {
    gap: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: Colors.surface[400],
    fontSize: 14,
  },
  reelCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surface[900],
  },
  reelThumb: {
    width: '100%',
    aspectRatio: 9 / 16,
  },
  reelThumbPlaceholder: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: Colors.surface[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reelInfo: {
    padding: 10,
    backgroundColor: Colors.surface[900],
  },
  reelTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  reelMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reelProducts: {
    color: Colors.surface[400],
    fontSize: 11,
  },
});
