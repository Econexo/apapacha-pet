// ApapachaPet 2.0 — paleta luminosa, cálida, con gradiente firma (lila→lavanda).
// Se conservan todas las llaves usadas por las pantallas actuales (compatibilidad),
// solo se actualizan los valores + se agregan tokens nuevos y gradientes.
export const colors = {
  // Brand
  primary: '#7C4DBB',        // Morado principal (más luminoso que el 6B35A0 anterior)
  primaryDark: '#5E2E93',    // Press/hover
  primaryLight: '#F3EBFB',   // Fondo suave morado (tint)
  brand2: '#B98AE0',         // Lila — extremo del gradiente
  brandTint: '#F3EBFB',
  accent: '#57B06B',         // Verde verificado/éxito (del logo, profundizado)
  accentBlue: '#7EC8E3',     // Azul del logo
  lilac: '#B98AE0',
  gold: '#EBAE3E',           // Estrellas/rating

  // Base
  background: '#FCFAFF',     // Casi blanco con tinte lila
  surface: '#FFFFFF',
  surfaceAlt: '#F6F0FC',     // Fondo hundido / insets
  textMain: '#2C2340',       // Tinta suave (no negro duro)
  textMuted: '#8B7FA6',      // Texto secundario
  border: '#EFE7F6',         // Hairline lila muy claro

  // Semantic — success (verde)
  success: '#57B06B',
  successBg: '#E9F6EC',
  successBorder: '#BFE6C8',
  successText: '#2E7D4B',
  successTextDark: '#1C4E30',

  // Semantic — danger
  danger: '#E0574C',
  dangerBg: '#FDEEED',
  dangerBorder: '#F6C9C4',
  dangerText: '#B23A30',
  dangerTextDark: '#7F1D1D',

  // Semantic — warning (oro)
  warning: '#EBAE3E',
  warningBg: '#FDF5E6',
  warningBorder: '#F5E0B0',
  warningText: '#8A5A12',

  // Semantic — info (azul)
  info: '#4A9DB5',
  infoBg: '#EFF8FC',
  infoBorder: '#B3DCE8',
};

// Gradientes (para expo-linear-gradient). Ángulo por defecto 135°.
export const gradients = {
  brand: ['#7C4DBB', '#B98AE0'] as const,       // botones, avatar, FAB, barras
  brandDeep: ['#5E2E93', '#7C4DBB'] as const,
  hero: ['#EFE4FB', '#FCE9F1', '#E6F6EC'] as const, // washes suaves / blobs
  gold: ['#F2C15A', '#E0912A'] as const,
};
