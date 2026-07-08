import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../../theme/colors';
import { radii, shadows } from '../../theme/design';
import { fonts } from '../../theme/typography';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'pill';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  active?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, active, style }: Props) {
  const fg = variant === 'primary' || (variant === 'pill' && active) ? '#fff' : colors.primary;
  const inner = loading
    ? <ActivityIndicator color={fg} size="small" />
    : (
      <View style={styles.row}>
        {icon && <Ionicons name={icon} size={17} color={fg} />}
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      </View>
    );

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}
        style={[shadows.sm, { borderRadius: radii.md }, disabled && { opacity: 0.5 }, style]}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'pill' && active) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={[{ borderRadius: radii.full }, style]}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}
      style={[variant === 'pill' ? styles.pillIdle : styles.ghost, disabled && { opacity: 0.5 }, style]}>
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontFamily: fonts.extrabold, fontSize: 15 },
  primary: { paddingVertical: 15, paddingHorizontal: 22, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  ghost: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  pill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  pillIdle: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
