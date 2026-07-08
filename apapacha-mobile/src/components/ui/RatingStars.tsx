import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export function RatingStars({ value, count, size = 14, showValue = true }: { value: number; count?: number; size?: number; showValue?: boolean }) {
  const rounded = Math.round(value);
  return (
    <View style={styles.row}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(s => (
          <Ionicons key={s} name={s <= rounded ? 'star' : 'star-outline'} size={size} color={colors.gold} />
        ))}
      </View>
      {showValue && <Text style={[styles.val, { fontSize: size + 1 }]}>{value.toFixed(1)}</Text>}
      {count != null && <Text style={styles.count}>({count})</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { flexDirection: 'row', gap: 1 },
  val: { fontFamily: fonts.extrabold, color: colors.textMain },
  count: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
});
