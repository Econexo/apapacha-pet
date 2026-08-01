import { Platform, useWindowDimensions } from 'react-native';

// Escritorio = web con ventana ancha. En móvil (nativo, o navegador estrecho)
// se mantiene la barra inferior, que es el patrón correcto ahí: el diseño
// móvil no cambia, lo de escritorio es aditivo.
export const DESKTOP_MIN_WIDTH = 900;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}
