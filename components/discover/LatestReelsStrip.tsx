import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Film, Play } from 'lucide-react-native';
import { API_BASE } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { StoryRingSkeleton } from '@/components/Skeleton';
import type { DiscoverReel } from '@/types/discover';

async function fetchReels(): Promise<DiscoverReel[]> {
  const res = await fetch(`${API_BASE}/api/discover/reels`);
  if (!res.ok) throw new Error('Failed to load reels');
  const json = await res.json() as { reels: DiscoverReel[] };
  return json.reels ?? [];
}

// One reel per store (first occurrence — the endpoint already round-robins
// across stores per request), so each story avatar represents a distinct store.
function dedupeByStore(reels: DiscoverReel[], limit = 20): DiscoverReel[] {
  const seen = new Set<string>();
  const result: DiscoverReel[] = [];
  for (const reel of reels) {
    if (seen.has(reel.store_id)) continue;
    seen.add(reel.store_id);
    result.push(reel);
    if (result.length >= limit) break;
  }
  return result;
}

export function LatestReelsStrip() {
  const [reels, setReels] = useState<DiscoverReel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReels()
      .then(all => setReels(dedupeByStore(all)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && reels.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text style={styles.label}>LATEST REELS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <StoryRingSkeleton key={i} />)
          : reels.map(reel => (
              <Pressable
                key={reel.id}
                style={({ pressed }) => [styles.item, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() =>
                  router.push(
                    `/(discover)/(tabs)/reels?reelId=${reel.id}` as Parameters<typeof router.push>[0]
                  )
                }
              >
                <View style={styles.ring}>
                  {reel.thumbnail_url ? (
                    <Image source={{ uri: reel.thumbnail_url }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Film size={18} color={Colors.brand} />
                    </View>
                  )}
                  <View style={styles.playBadge}>
                    <Play size={9} color="#000" fill="#000" />
                  </View>
                </View>
                <Text style={styles.name} numberOfLines={1}>{reel.store_name}</Text>
              </Pressable>
            ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff' },
  label: {
    fontSize: 9, fontWeight: '800', color: Colors.surface[400],
    letterSpacing: 1.2, paddingHorizontal: 16, marginBottom: 12,
  },
  list: { paddingHorizontal: 16, gap: 16 },
  item: { alignItems: 'center', width: 68 },
  ring: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.brand, padding: 2.5, marginBottom: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: 63, height: 63, borderRadius: 31.5 },
  avatarFallback: {
    width: 63, height: 63, borderRadius: 31.5,
    backgroundColor: Colors.surface[100], alignItems: 'center', justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute', bottom: -1, right: -1,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.brand, borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 10, color: Colors.dark, fontWeight: '700', textAlign: 'center' },
});
