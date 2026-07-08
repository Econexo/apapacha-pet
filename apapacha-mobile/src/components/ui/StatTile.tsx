import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/design';
import { fonts } from '../../theme/typography';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function StatTile({ icon, value, label, tint = colors.primary, style }: {
  icon: IconName; value: string | number; label: string; tint?: string; style?: ViewStyle;
}) {
  return (
    <View style={[styles.tile, style]}>
      <View style={[styles.iconBox, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 16 },
  iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  value: { fontFamily: fonts.display, fontSize: 24, color: colors.textMain, letterSpacing: -0.3 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
