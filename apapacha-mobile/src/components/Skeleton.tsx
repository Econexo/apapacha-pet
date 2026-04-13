import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.bone,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

// ── Space Card Skeleton ──────────────────────────────────────────────────────
export function SpaceCardSkeleton() {
  return (
    <View style={styles.spaceCard}>
      <Skeleton height={250} borderRadius={16} style={styles.spaceImage} />
      <View style={styles.spaceInfo}>
        <Skeleton width="50%" height={14} borderRadius={6} style={styles.mb8} />
        <Skeleton width="80%" height={14} borderRadius={6} style={styles.mb8} />
        <Skeleton width="35%" height={14} borderRadius={6} />
      </View>
    </View>
  );
}

// ── Visiter Card Skeleton ────────────────────────────────────────────────────
export function VisiterCardSkeleton() {
  return (
    <View style={styles.visiterCard}>
      <View style={styles.visiterRow}>
        <Skeleton width={65} height={65} borderRadius={35} style={styles.mr16} />
        <View style={{ flex: 1 }}>
          <Skeleton width="60%" height={16} borderRadius={6} style={styles.mb8} />
          <Skeleton width="80%" height={13} borderRadius={6} style={styles.mb8} />
          <Skeleton width="40%" height={13} borderRadius={6} />
        </View>
      </View>
      <View style={styles.visiterFooter}>
        <Skeleton width="30%" height={14} borderRadius={6} />
        <Skeleton width="25%" height={16} borderRadius={6} />
      </View>
    </View>
  );
}

// ── Detail Hero Skeleton ─────────────────────────────────────────────────────
export function DetailHeroSkeleton() {
  return (
    <View>
      <Skeleton height={300} borderRadius={0} />
      <View style={styles.detailContent}>
        <Skeleton width="85%" height={22} borderRadius={8} style={styles.mb8} />
        <Skeleton width="45%" height={15} borderRadius={6} style={styles.mb16} />
        <View style={styles.badgesRow}>
          <Skeleton width={120} height={28} borderRadius={8} style={styles.mr8} />
          <Skeleton width={100} height={28} borderRadius={8} />
        </View>
        <View style={styles.divider} />
        <View style={styles.hostRow}>
          <Skeleton width={48} height={48} borderRadius={24} style={styles.mr16} />
          <View>
            <Skeleton width={140} height={15} borderRadius={6} style={styles.mb8} />
            <Skeleton width={100} height={13} borderRadius={6} />
          </View>
        </View>
        <View style={styles.divider} />
        <Skeleton width="40%" height={17} borderRadius={6} style={styles.mb12} />
        <Skeleton height={13} borderRadius={6} style={styles.mb8} />
        <Skeleton height={13} borderRadius={6} style={styles.mb8} />
        <Skeleton width="70%" height={13} borderRadius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bone: { backgroundColor: colors.border },
  // SpaceCard
  spaceCard: { marginBottom: 24 },
  spaceImage: { marginBottom: 12 },
  spaceInfo: { paddingHorizontal: 4 },
  // VisiterCard
  visiterCard: { backgroundColor: colors.surface, marginBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  visiterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  visiterFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  // Detail
  detailContent: { padding: 24 },
  badgesRow: { flexDirection: 'row', marginBottom: 4 },
  hostRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
  // Spacing helpers
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mr8: { marginRight: 8 },
  mr16: { marginRight: 16 },
});
