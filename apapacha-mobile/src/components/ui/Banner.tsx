import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/design';
import { fonts } from '../../theme/typography';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Tone = 'info' | 'warning' | 'success';

const TONES: Record<Tone, { accent: string; iconBg: string }> = {
  info:    { accent: colors.primary, iconBg: colors.brandTint },
  warning: { accent: colors.warning, iconBg: colors.warningBg },
  success: { accent: colors.success, iconBg: colors.successBg },
};

export function Banner({ title, text, icon = 'information-circle', tone = 'info', onPress }: {
  title: string; text?: string; icon?: IconName; tone?: Tone; onPress?: () => void;
}) {
  const t = TONES[tone];
  const Wrap: any = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.85} style={[styles.banner, { borderLeftColor: t.accent }]}>
      <View style={[styles.iconBox, { backgroundColor: t.iconBg }]}>
        <Ionicons name={icon} size={19} color={t.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {text ? <Text style={styles.text}>{text}</Text> : null}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderRadius: radii.md, padding: 14, ...shadows.sm },
  iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMain },
  text: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
});
