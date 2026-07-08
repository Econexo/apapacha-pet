import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Fondo ambiental: blobs de gradiente que derivan lento y suave.
function Blob({ style, colors, delay = 0, dx = 40, dy = 30 }: { style: ViewStyle; colors: [string, string]; delay?: number; dx?: number; dy?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: 11000, delay, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(t, { toValue: 0, duration: 11000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  return (
    <Animated.View style={[styles.blob, style, { transform: [{ translateX }, { translateY }] }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export function ScreenBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Blob style={{ width: 380, height: 380, top: -130, left: -100 }} colors={['#EFE4FB', '#E3D3F7']} dx={44} dy={34} />
      <Blob style={{ width: 320, height: 320, top: 160, right: -130 }} colors={['#FCE9F1', '#FBDCE8']} delay={2200} dx={-40} dy={46} />
      <Blob style={{ width: 340, height: 340, bottom: -150, left: 30 }} colors={['#E6F6EC', '#D9F0E1']} delay={4400} dx={30} dy={-38} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 9999, overflow: 'hidden', opacity: 0.5 },
});
