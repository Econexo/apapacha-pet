import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

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

export function VisiterCard({ 
  id, name, professionTitle, pricePerVisit, rating, totalVisits, imageUrl, onPress 
}: VisiterCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => onPress(id)}>
      <View style={styles.contentRow}>
        <Image source={{ uri: imageUrl }} style={styles.avatar} />
        
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ Identificado</Text>
            </View>
          </View>
          
          <Text style={styles.profession} numberOfLines={1}>{professionTitle}</Text>
          
          <View style={styles.statsRow}>
            <Text style={styles.statText}>⭐ {rating}</Text>
            <Text style={styles.statDot}> • </Text>
            <Text style={styles.statText}>{totalVisits} visitas</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.footerRow}>
        <Text style={styles.priceLabel}>Tarifa base:</Text>
        <Text style={styles.priceValue}>${pricePerVisit} <Text style={styles.priceDetail}>/ 40 min</Text></Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 65,
    height: 65,
    borderRadius: 35,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
    marginRight: 8,
  },
  badge: {
    backgroundColor: `${colors.success}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  profession: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
  },
  statDot: {
    color: colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
  },
  priceDetail: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  }
});
