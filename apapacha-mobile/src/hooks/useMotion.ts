import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

// Respeta la preferencia de "reducir movimiento" del sistema (accesibilidad obligatoria).
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (mounted) setReduced(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; sub.remove(); };
  }, []);
  return reduced;
}

// Micro-feedback de press: escala sutil con spring sin rebote (default de producción, Jakub).
export function usePressScale(to = 0.97) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, bounciness: 0, speed: 40 }).start();
  const onPressIn = () => { if (!reduced) spring(to); };
  const onPressOut = () => { if (!reduced) spring(1); };
  return { scale, onPressIn, onPressOut };
}
