import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Eye, Play, Store } from 'lucide-react-native';
import { API_BASE } from '@/lib/api';
import { Colors } from '@/constants/theme';
import type { DiscoverReel } from '@/types/discover';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  reel: DiscoverReel;
  isActive: boolean;
  height: number;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function ReelCard({ reel, isActive, height }: Props) {
  const player = useVideoPlayer(reel.video_url, p => {
    p.loop = true;
    p.muted = true;
  });

  const [videoReady, setVideoReady] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setVideoReady(true);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (isActive) {
      player.play();
      if (!viewTracked.current) {
        viewTracked.current = true;
        fetch(`${API_BASE}/api/reels/${reel.id}/view`, { method: 'POST' }).catch(() => {});
      }
    } else {
      player.pause();
    }
  }, [isActive]);

  return (
    <Pressable
      style={[styles.root, { width: SCREEN_WIDTH, height }]}
      onPress={() => router.push(`/store/${reel.store_slug}`)}
    >
      {/* Video layer */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Thumbnail poster — shown while video buffers, hidden once ready */}
      {!videoReady && !!reel.thumbnail_url && (
        <Image
          source={{ uri: reel.thumbnail_url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}

      {/* Dark gradient scrim at the bottom */}
      <View style={styles.gradient} />

      {/* Paused indicator */}
      {!isActive && (
        <View style={styles.pausedOverlay}>
          <Play size={40} color="rgba(255,255,255,0.7)" fill="rgba(255,255,255,0.7)" />
        </View>
      )}

      {/* Bottom info area */}
      <View style={styles.bottomOverlay}>

        {/* Glass info card */}
        <View style={styles.glassCard}>
          {/* Store row */}
          <View style={styles.storeRow}>
            {reel.store_logo ? (
              <Image source={{ uri: reel.store_logo }} style={styles.storeLogo} />
            ) : (
              <View style={styles.storeLogoFallback}>
                <Store size={14} color={Colors.brand} />
              </View>
            )}
            <Text style={styles.storeName} numberOfLines={1}>{reel.store_name}</Text>
            <View style={styles.viewsBadge}>
              <Eye size={10} color="rgba(255,255,255,0.75)" />
              <Text style={styles.viewsText}>{fmt(reel.view_count)}</Text>
            </View>
          </View>

          {/* Reel title */}
          {!!reel.title && (
            <Text style={styles.reelTitle} numberOfLines={2}>{reel.title}</Text>
          )}
        </View>

        {/* Product chips — scroll outside the glass card so they bleed edge-to-edge */}
        {reel.products.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.products}
          >
            {reel.products.map(p => (
              <View key={p.product_id} style={styles.productChip}>
                {p.image_url ? (
                  <Image source={{ uri: p.image_url }} style={styles.productImg} />
                ) : null}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.productPrice}>₦{p.price.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  gradient: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
    gap: 10,
  },

  /* Glass card */
  glassCard: {
    marginHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },

  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.brand,
  },
  storeLogoFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1.5,
    borderColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  viewsText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  reelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 18,
  },

  /* Product chips */
  products: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  productImg: {
    width: 42,
    height: 42,
  },
  productInfo: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 1,
  },
  productName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    maxWidth: 100,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.brand,
  },
});
