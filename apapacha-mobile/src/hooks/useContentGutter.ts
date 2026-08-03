import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useIsDesktop } from './useIsDesktop';

/** Ancho máximo de la columna de contenido en escritorio. */
export const MAX_CONTENT_WIDTH = 1120;
/** Debe coincidir con el ancho de DesktopSidebar. */
export const SIDEBAR_WIDTH = 260;

/**
 * Margen lateral que limita el contenido a una columna legible en pantallas
 * anchas. Sin esto, en un monitor la barra de búsqueda medía casi 1200 px y
 * las tarjetas se estiraban de borde a borde.
 *
 * Se resuelve con padding en el contenedor de la escena en vez de con
 * `maxWidth` + `alignSelf`: el contenedor de pestañas es una fila, y ahí
 * `alignSelf` alinea en vertical y colapsaría el alto.
 *
 * @param reservaMenu true cuando el menú lateral ocupa parte del ancho.
 */
export function useContentGutter(reservaMenu: boolean) {
  const { width } = useWindowDimensions();
  const isDesktop = useIsDesktop();

  // El estilo se memoriza: devolver un objeto nuevo en cada render cambia la
  // identidad de `sceneStyle`/`contentStyle` del navegador en cada pasada, y
  // eso realimenta el render hasta dejar la app colgada en el spinner inicial.
  return useMemo(() => {
    if (!isDesktop) return undefined;
    const disponible = width - (reservaMenu ? SIDEBAR_WIDTH : 0);
    const margen = Math.max(0, Math.floor((disponible - MAX_CONTENT_WIDTH) / 2));
    return margen > 0 ? { paddingHorizontal: margen } : undefined;
  }, [isDesktop, width, reservaMenu]);
}
