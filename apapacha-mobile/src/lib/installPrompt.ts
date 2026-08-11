import { Platform } from 'react-native';

/**
 * Captura del evento de instalación del navegador.
 *
 * `beforeinstallprompt` se dispara al cargar la página, mucho antes de que el
 * usuario entre a su perfil, y solo se puede usar el evento que se guardó en
 * ese momento. Por eso el listener se registra al importar el módulo y no
 * dentro de un componente.
 *
 * Solo lo emiten los navegadores basados en Chromium (Android y escritorio).
 * Safari no lo implementa: ahí la instalación es manual y solo cabe explicarla.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let evento: BeforeInstallPromptEvent | null = null;
const suscriptores = new Set<() => void>();

function avisar() {
  suscriptores.forEach(fn => { try { fn(); } catch { /* un suscriptor roto no rompe al resto */ } });
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Evita el banner automático del navegador: ofrecemos la instalación
    // desde el perfil, en su contexto y con explicación.
    e.preventDefault();
    evento = e as BeforeInstallPromptEvent;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    evento = null;
    avisar();
  });
}

export function puedeInstalarDirecto(): boolean {
  return evento !== null;
}

export function suscribirseAInstalacion(fn: () => void): () => void {
  suscriptores.add(fn);
  return () => { suscriptores.delete(fn); };
}

/** Lanza el diálogo nativo. Devuelve true si el usuario aceptó instalar. */
export async function lanzarInstalacion(): Promise<boolean> {
  if (!evento) return false;
  try {
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    // El evento se consume: no se puede reutilizar.
    if (outcome === 'accepted') { evento = null; avisar(); }
    return outcome === 'accepted';
  } catch {
    return false;
  }
}

export type Sistema = 'ios' | 'android' | 'escritorio-chromium' | 'escritorio-otro' | 'desconocido';

export function detectarSistema(): Sistema {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return 'desconocido';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  // Chromium de escritorio: es el único que ofrece instalación con un clic.
  const esChromium = /Chrome|Chromium|Edg\//.test(ua) && !/OPR\//.test(ua);
  return esChromium ? 'escritorio-chromium' : 'escritorio-otro';
}

/** En iOS solo Safari puede agregar a la pantalla de inicio. */
export function esSafariIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}
