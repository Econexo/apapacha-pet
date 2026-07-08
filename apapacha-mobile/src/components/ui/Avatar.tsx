import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export function Avatar({ name, uri, size = 40, gradient }: { name?: string | null; uri?: string | null; size?: number; gradient?: boolean }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const radius = size / 2;
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.brandTint }} />;
  }
  if (gradient) {
    return (
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.base, { width: size, height: size, borderRadius: radius }]}>
        <Text style={[styles.txt, { fontSize: size * 0.42, color: '#fff' }]}>{initial}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: radius, backgroundColor: colors.brandTint }]}>
      <Text style={[styles.txt, { fontSize: size * 0.42, color: colors.primary }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  txt: { fontFamily: fonts.display },
});
