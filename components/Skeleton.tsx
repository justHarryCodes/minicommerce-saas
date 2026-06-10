import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

// ─── Base pulsing block ───────────────────────────────────────────────────────

interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#CBD5E1', opacity }, style]}
    />
  );
}

// ─── Product card skeleton (148 × ~220) ──────────────────────────────────────

export function ProductCardSkeleton() {
  return (
    <View style={skeletonStyles.productCard}>
      <Skeleton width={148} height={148} borderRadius={0} />
      <View style={skeletonStyles.productBody}>
        <Skeleton width="90%" height={11} />
        <Skeleton width="60%" height={11} />
        <Skeleton width={70} height={13} borderRadius={4} style={skeletonStyles.mt2} />
        <View style={skeletonStyles.storeRow}>
          <Skeleton width={14} height={14} borderRadius={7} />
          <Skeleton width={70} height={9} />
        </View>
      </View>
    </View>
  );
}

// ─── Vendor card skeleton (148 wide) ─────────────────────────────────────────

export function VendorCardSkeleton() {
  return (
    <View style={skeletonStyles.vendorCard}>
      <Skeleton width={56} height={56} borderRadius={28} />
      <Skeleton width={90} height={11} style={skeletonStyles.mt4} />
      <Skeleton width={80} height={22} borderRadius={7} />
      <Skeleton width={60} height={9} />
      <Skeleton width={124} height={28} borderRadius={9} style={skeletonStyles.mt2} />
      <Skeleton width={100} height={8} borderRadius={4} />
    </View>
  );
}

// ─── Story ring skeleton ──────────────────────────────────────────────────────

export function StoryRingSkeleton() {
  return (
    <View style={skeletonStyles.storyItem}>
      <Skeleton width={68} height={68} borderRadius={34} />
      <Skeleton width={48} height={9} borderRadius={4} style={skeletonStyles.mt4} />
    </View>
  );
}

// ─── Section header skeleton ──────────────────────────────────────────────────

export function SectionHeaderSkeleton() {
  return (
    <View style={skeletonStyles.sectionHeader}>
      <Skeleton width={28} height={28} borderRadius={8} />
      <Skeleton width={120} height={14} />
      <Skeleton width={55} height={14} borderRadius={6} style={skeletonStyles.ml} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  productCard: {
    width: 148,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  productBody: {
    padding: 9,
    gap: 6,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  ml: { marginLeft: 'auto' },

  vendorCard: {
    width: 148,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },

  storyItem: {
    alignItems: 'center',
    width: 68,
    gap: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
});
