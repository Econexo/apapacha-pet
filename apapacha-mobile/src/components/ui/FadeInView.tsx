import React, { useRef, useEffect } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';
import { useReducedMotion } from '../../hooks/useMotion';

// Entrada "materializando" (receta Jakub, adaptada a RN): opacity + translateY,
// easing out-cubic, ~380ms. Con reduce-motion aparece instantáneo (estado final).
export function FadeInView({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) { t.setValue(1); return; }
    const anim = Animated.timing(t, {
      toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [reduced]);

  return (
    <Animated.View style={[style, {
      opacity: t,
      transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}
