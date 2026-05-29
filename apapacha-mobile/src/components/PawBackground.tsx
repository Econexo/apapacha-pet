import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Positions as fractions of screen — resolved to px so web renders them reliably
const PAWS: { tx: number; ty: number; size: number; opacity: number; rotate: string }[] = [
  { tx: 0.07, ty: 0.04,  size: 36, opacity: 0.16, rotate: '-18deg' },
  { tx: 0.72, ty: 0.07,  size: 24, opacity: 0.12, rotate:  '14deg' },
  { tx: 0.38, ty: 0.12,  size: 20, opacity: 0.10, rotate:  '-5deg' },
  { tx: 0.83, ty: 0.19,  size: 30, opacity: 0.14, rotate:  '25deg' },
  { tx: 0.12, ty: 0.25,  size: 26, opacity: 0.13, rotate: '-30deg' },
  { tx: 0.60, ty: 0.33,  size: 40, opacity: 0.15, rotate:   '8deg' },
  { tx: 0.04, ty: 0.42,  size: 22, opacity: 0.11, rotate:  '18deg' },
  { tx: 0.80, ty: 0.47,  size: 18, opacity: 0.10, rotate: '-12deg' },
  { tx: 0.44, ty: 0.54,  size: 32, opacity: 0.16, rotate:  '35deg' },
  { tx: 0.16, ty: 0.61,  size: 24, opacity: 0.13, rotate: '-22deg' },
  { tx: 0.74, ty: 0.68,  size: 38, opacity: 0.15, rotate:  '10deg' },
  { tx: 0.02, ty: 0.73,  size: 20, opacity: 0.11, rotate: '-40deg' },
  { tx: 0.55, ty: 0.80,  size: 26, opacity: 0.14, rotate:  '20deg' },
  { tx: 0.87, ty: 0.86,  size: 22, opacity: 0.12, rotate: '-15deg' },
  { tx: 0.28, ty: 0.91,  size: 34, opacity: 0.15, rotate:  '28deg' },
];

export function PawBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
      {PAWS.map((p, i) => (
        <Text
          key={i}
          style={{
            position: 'absolute',
            top: p.ty * H,
            left: p.tx * W,
            fontSize: p.size,
            opacity: p.opacity,
            transform: [{ rotate: p.rotate }],
          }}
        >
          🐾
        </Text>
      ))}
    </View>
  );
}
