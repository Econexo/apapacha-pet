import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useCountUp } from '../../hooks/useCountUp';
import { useReducedMotion } from '../../hooks/useMotion';

// Número que cuenta hasta su valor (ease-out). Con reduce-motion muestra el valor final.
export function AnimatedNumber({ value, format, style }: { value: number; format?: (n: number) => string; style?: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  const animated = useCountUp(value);
  const shown = reduced ? value : animated;
  return <Text style={style}>{format ? format(shown) : String(shown)}</Text>;
}
