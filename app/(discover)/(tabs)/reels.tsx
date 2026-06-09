import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { API_BASE } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { ReelCard } from '@/components/discover/ReelCard';
import { getCachedReels, isCacheStale, setCachedReels } from '@/lib/discover-cache';
import type { DiscoverReel } from '@/types/discover';

async function fetchReels(): Promise<DiscoverReel[]> {
  const res = await fetch(`${API_BASE}/api/discover/reels`);
  if (!res.ok) throw new Error(`Reels fetch failed (${res.status})`);
  const json = await res.json() as { reels: DiscoverReel[] };
  return json.reels ?? [];
}

export default function ReelsTab() {
  const [reels, setReels] = useState<DiscoverReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reelHeight, setReelHeight] = useState(0);

  useEffect(() => {
    const cached = getCachedReels();
    if (cached.length > 0) {
      setReels(cached);
      setLoading(false);
    }

    if (isCacheStale()) {
      fetchReels()
        .then(fresh => { setCachedReels(fresh); setReels(fresh); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0] != null) setActiveIndex(viewableItems[0].index ?? 0);
    },
    []
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 75 });

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <View
        style={styles.feed}
        onLayout={e => setReelHeight(e.nativeEvent.layout.height)}
      >
        {loading && reels.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.brand} size="large" />
            <Text style={styles.hint}>Loading reels…</Text>
          </View>
        ) : reels.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.hint}>No reels yet — check back soon</Text>
          </View>
        ) : reelHeight > 0 ? (
          <FlatList
            data={reels}
            keyExtractor={r => r.id}
            pagingEnabled
            snapToInterval={reelHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, i) => ({ length: reelHeight, offset: reelHeight * i, index: i })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig.current}
            renderItem={({ item, index }) => (
              <ReelCard reel={item} isActive={index === activeIndex} height={reelHeight} />
            )}
            windowSize={3}
            maxToRenderPerBatch={2}
            initialNumToRender={2}
            removeClippedSubviews
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  feed: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  hint: { color: Colors.darkMuted, fontSize: 14 },
});
