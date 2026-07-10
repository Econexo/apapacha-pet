import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion } from '../../hooks/useMotion';

// Fondo ambiental: blobs de gradiente que derivan lento y suave.
function Blob({ style, colors, delay = 0, dx = 40, dy = 30, reduced = false }: { style: ViewStyle; colors: [string, string]; delay?: number; dx?: number; dy?: number; reduced?: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return; // accesibilidad: sin deriva si el usuario reduce movimiento
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: 14000, delay, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(t, { toValue: 0, duration: 14000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced]);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  return (
    <Animated.View style={[styles.blob, style, { transform: [{ translateX }, { translateY }] }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export function ScreenBackground() {
  const reduced = useReducedMotion();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Blob style={{ width: 380, height: 380, top: -130, left: -100 }} colors={['#EFE4FB', '#E3D3F7']} dx={44} dy={34} reduced={reduced} />
      <Blob style={{ width: 320, height: 320, top: 160, right: -130 }} colors={['#FCE9F1', '#FBDCE8']} delay={2200} dx={-40} dy={46} reduced={reduced} />
      <Blob style={{ width: 340, height: 340, bottom: -150, left: 30 }} colors={['#E6F6EC', '#D9F0E1']} delay={4400} dx={30} dy={-38} reduced={reduced} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 9999, overflow: 'hidden', opacity: 0.5 },
});
