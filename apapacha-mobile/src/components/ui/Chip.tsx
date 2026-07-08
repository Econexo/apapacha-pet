import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/design';
import { fonts } from '../../theme/typography';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TONES = {
  brand: { bg: colors.brandTint, fg: colors.primary, bd: 'transparent' },
  leaf:  { bg: colors.successBg, fg: colors.successText, bd: 'transparent' },
  gold:  { bg: colors.warningBg, fg: colors.warningText, bd: 'transparent' },
  line:  { bg: colors.surface, fg: colors.textMuted, bd: colors.border },
} as const;

export function Chip({ label, icon, tone = 'brand' }: { label: string; icon?: IconName; tone?: keyof typeof TONES }) {
  const t = TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg, borderColor: t.bd }]}>
      {icon && <Ionicons name={icon} size={13} color={t.fg} />}
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.full, borderWidth: 1 },
  text: { fontFamily: fonts.bold, fontSize: 12.5 },
});
