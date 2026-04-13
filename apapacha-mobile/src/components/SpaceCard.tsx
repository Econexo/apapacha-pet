import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

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
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => onPress(id)}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {rating}</Text>
        </View>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.location} numberOfLines={1}>{location}</Text>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.price}>
          <Text style={styles.priceValue}>${pricePerNight.toLocaleString('es-CL')}</Text>
          <Text> / noche</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, marginBottom: 24, borderRadius: 16, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 250, position: 'relative', borderRadius: 16, overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  ratingBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  ratingText: { fontWeight: '700', fontSize: 13, color: colors.textMain },
  infoContainer: { paddingVertical: 12, paddingHorizontal: 4 },
  location: { fontSize: 15, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  title: { fontSize: 15, color: colors.textMuted, marginBottom: 6 },
  price: { fontSize: 14, color: colors.textMuted },
  priceValue: { fontWeight: '700', color: colors.textMain },
});
