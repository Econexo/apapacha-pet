import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Positions as fractions of screen — resolved to px so web renders them reliably
const PAWS: { tx: number; ty: number; size: number; opacity: number; rotate: string }[] = [
  { tx: 0.07, ty: 0.04,  size: 36, opacity: 0.09, rotate: '-18deg' },
  { tx: 0.72, ty: 0.07,  size: 24, opacity: 0.07, rotate:  '14deg' },
  { tx: 0.38, ty: 0.12,  size: 20, opacity: 0.06, rotate:  '-5deg' },
  { tx: 0.83, ty: 0.19,  size: 30, opacity: 0.08, rotate:  '25deg' },
  { tx: 0.12, ty: 0.25,  size: 26, opacity: 0.07, rotate: '-30deg' },
  { tx: 0.60, ty: 0.33,  size: 40, opacity: 0.09, rotate:   '8deg' },
  { tx: 0.04, ty: 0.42,  size: 22, opacity: 0.06, rotate:  '18deg' },
  { tx: 0.80, ty: 0.47,  size: 18, opacity: 0.06, rotate: '-12deg' },
  { tx: 0.44, ty: 0.54,  size: 32, opacity: 0.09, rotate:  '35deg' },
  { tx: 0.16, ty: 0.61,  size: 24, opacity: 0.07, rotate: '-22deg' },
  { tx: 0.74, ty: 0.68,  size: 38, opacity: 0.08, rotate:  '10deg' },
  { tx: 0.02, ty: 0.73,  size: 20, opacity: 0.06, rotate: '-40deg' },
  { tx: 0.55, ty: 0.80,  size: 26, opacity: 0.08, rotate:  '20deg' },
  { tx: 0.87, ty: 0.86,  size: 22, opacity: 0.07, rotate: '-15deg' },
  { tx: 0.28, ty: 0.91,  size: 34, opacity: 0.08, rotate:  '28deg' },
];

export function PawBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
