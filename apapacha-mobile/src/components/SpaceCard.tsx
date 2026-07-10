import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, shadows } from '../theme/design';
import { AppText } from './ui/AppText';
import { RatingStars } from './ui/RatingStars';
import { Chip } from './ui/Chip';
import { usePressScale } from '../hooks/useMotion';

interface SpaceCardProps {
  id: string;
  title: string;
  location: string;
  pricePerNight: number;
  rating: number;
  imageUrl: string;
  onPress: (id: string) => void;
}

export function SpaceCard({ id, title, location, pricePerNight, rating, imageUrl, onPress }: SpaceCardProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
    <TouchableOpacity activeOpacity={0.95} style={styles.card} onPress={() => onPress(id)} onPressIn={onPressIn} onPressOut={onPressOut}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <View style={styles.typeChip}>
          <Ionicons name="home" size={11} color={colors.primary} />
          <AppText variant="label" color={colors.primary} style={{ fontSize: 10 }}>Alojamiento</AppText>
        </View>
      </View>
      <View style={styles.info}>
        <AppText variant="title" numberOfLines={1} style={{ fontSize: 18 }}>{title}</AppText>
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <AppText variant="small" color={colors.textMuted} numberOfLines={1}>{location}</AppText>
        </View>
        <View style={styles.footer}>
          {rating > 0 ? <RatingStars value={rating} size={13} showValue /> : <Chip label="Nuevo" tone="brand" />}
          <View style={styles.priceRow}>
            <AppText variant="h" style={{ fontSize: 17 }}>${pricePerNight.toLocaleString('es-CL')}</AppText>
            <AppText variant="small" color={colors.textMuted}> /noche</AppText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, marginBottom: 18, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  imageContainer: { width: '100%', height: 194, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover', backgroundColor: colors.surfaceAlt },
  typeChip: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  info: { paddingVertical: 14, paddingHorizontal: 16 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
});
