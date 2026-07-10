import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../../theme/colors';
import { radii, shadows } from '../../theme/design';
import { fonts } from '../../theme/typography';
import { usePressScale } from '../../hooks/useMotion';

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
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const fg = variant === 'primary' || (variant === 'pill' && active) ? '#fff' : colors.primary;
  const inner = loading
    ? <ActivityIndicator color={fg} size="small" />
    : (
      <View style={styles.row}>
        {icon && <Ionicons name={icon} size={17} color={fg} />}
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      </View>
    );
  const press = { onPressIn, onPressOut, activeOpacity: 0.9 };

  if (variant === 'primary') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.5 }, style]}>
        <TouchableOpacity onPress={onPress} disabled={disabled || loading} {...press} style={[shadows.sm, { borderRadius: radii.md }]}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
            {inner}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'pill' && active) {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        <TouchableOpacity onPress={onPress} disabled={disabled} {...press} style={{ borderRadius: radii.full }}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
            {inner}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.5 }, style]}>
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} {...press} style={variant === 'pill' ? styles.pillIdle : styles.ghost}>
        {inner}
      </TouchableOpacity>
    </Animated.View>
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
