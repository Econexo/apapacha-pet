import type { ViewStyle } from 'react-native';

export const radii = {
  sm:   10,
  md:   16,
  lg:   22,
  xl:   30,
  full: 999,
};

// Sombras suaves teñidas de morado (2.0)
export const shadows: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: {
    shadowColor: '#5E2E93',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  md: {
    shadowColor: '#5E2E93',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.11,
    shadowRadius: 28,
    elevation: 5,
  },
  lg: {
    shadowColor: '#5E2E93',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 48,
    elevation: 10,
  },
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  xxxl: 40,
};

export const label = {
  fontSize: 11,
  fontWeight: '800' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.9,
};
