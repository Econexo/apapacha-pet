import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, shadows } from '../theme/design';
import { AppText } from './ui/AppText';
import { RatingStars } from './ui/RatingStars';
import { Chip } from './ui/Chip';

interface VisiterCardProps {
  id: string;
  name: string;
  professionTitle: string;
  pricePerVisit: number;
  rating: number;
  totalVisits: number;
  imageUrl: string;
  onPress: (id: string) => void;
}

export function VisiterCard({ id, name, professionTitle, pricePerVisit, rating, totalVisits, imageUrl, onPress }: VisiterCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.card} onPress={() => onPress(id)}>
      <View style={styles.contentRow}>
        <Image source={{ uri: imageUrl }} style={styles.avatar} />
        <View style={styles.info}>
          <View style={styles.headerRow}>
            <AppText variant="title" numberOfLines={1} style={{ fontSize: 18, flexShrink: 1 }}>{name}</AppText>
            <Chip label="Verificado" icon="shield-checkmark" tone="leaf" />
          </View>
          <AppText variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 1 }}>{professionTitle}</AppText>
          <View style={styles.statsRow}>
            {rating > 0 ? <RatingStars value={rating} size={13} /> : <Chip label="Nuevo" tone="brand" />}
            <AppText variant="small" color={colors.textMuted}>· {totalVisits} visitas</AppText>
          </View>
        </View>
      </View>
      <View style={styles.footerRow}>
        <AppText variant="small" color={colors.textMuted}>Tarifa base</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <AppText variant="h" style={{ fontSize: 17 }}>${pricePerVisit.toLocaleString('es-CL')}</AppText>
          <AppText variant="small" color={colors.textMuted}> /visita</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, marginBottom: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 16, ...shadows.sm },
  contentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 64, height: 64, borderRadius: 20, marginRight: 14, backgroundColor: colors.surfaceAlt },
  info: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
});
