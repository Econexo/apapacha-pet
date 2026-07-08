import type { TextStyle } from 'react-native';

// Familias (nombres = export de @expo-google-fonts, se cargan en App.tsx)
export const fonts = {
  display:       'Fraunces_600SemiBold',
  displayMedium: 'Fraunces_500Medium',
  body:          'PlusJakartaSans_400Regular',
  medium:        'PlusJakartaSans_500Medium',
  semibold:      'PlusJakartaSans_600SemiBold',
  bold:          'PlusJakartaSans_700Bold',
  extrabold:     'PlusJakartaSans_800ExtraBold',
};

// Variantes tipográficas del sistema 2.0
export const type: Record<string, TextStyle> = {
  display1:   { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.6, lineHeight: 38 },
  display2:   { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.3, lineHeight: 30 },
  title:      { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.2, lineHeight: 26 },
  h:          { fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  body:       { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  small:      { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  label:      { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase' },
};

// Para cargar con useFonts()
export { }; // marker
