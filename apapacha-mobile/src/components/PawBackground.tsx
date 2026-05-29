import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Deterministic positions — no random so web/mobile hydration stay consistent
const PAWS: { top: number; left: number; size: number; opacity: number; rotate: string }[] = [
  { top:  3,  left:  7,  size: 34, opacity: 0.055, rotate: '-18deg' },
  { top:  6,  left: 72,  size: 22, opacity: 0.040, rotate:  '14deg' },
  { top: 11,  left: 38,  size: 18, opacity: 0.035, rotate: '-5deg'  },
  { top: 18,  left: 85,  size: 28, opacity: 0.050, rotate:  '25deg' },
  { top: 24,  left: 15,  size: 24, opacity: 0.042, rotate: '-30deg' },
  { top: 32,  left: 60,  size: 38, opacity: 0.048, rotate:  '8deg'  },
  { top: 40,  left:  5,  size: 20, opacity: 0.038, rotate:  '18deg' },
  { top: 46,  left: 82,  size: 16, opacity: 0.032, rotate: '-12deg' },
  { top: 53,  left: 42,  size: 30, opacity: 0.052, rotate:  '35deg' },
  { top: 60,  left: 18,  size: 22, opacity: 0.040, rotate: '-22deg' },
  { top: 67,  left: 75,  size: 36, opacity: 0.055, rotate:  '10deg' },
  { top: 72,  left:  2,  size: 18, opacity: 0.035, rotate: '-40deg' },
  { top: 79,  left: 55,  size: 24, opacity: 0.042, rotate:  '20deg' },
  { top: 86,  left: 88,  size: 20, opacity: 0.038, rotate: '-15deg' },
  { top: 91,  left: 28,  size: 32, opacity: 0.050, rotate:  '28deg' },
];

export function PawBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PAWS.map((p, i) => (
        <Text
          key={i}
          style={{
            position: 'absolute',
            top: `${p.top}%` as any,
            left: `${p.left}%` as any,
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
