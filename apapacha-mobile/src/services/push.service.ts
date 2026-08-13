import { Platform } from 'react-native';
import { supabase } from '../../supabase';

// La clave pública VAPID es pública por diseño (viaja al navegador en cada
// suscripción), igual que la anon key. Fallback embebido para no depender de la
// configuración de env vars en Vercel.
export const VAPID_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ??
  'BADHzebIKSf9AHdbaztv-Dt4tCRzUhwk7Y-bzDFq9i17_mD_GCNB9DYIKaE-m0jIuny1B-PsI6i9LLTH1Loi1NY';

export function isPushSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// En iOS el Web Push SOLO funciona si la PWA está instalada en la pantalla de
// inicio (iOS 16.4+). En navegador normal ni siquiera se puede pedir permiso.
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as any).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// La clave VAPID viaja en base64url; PushManager la quiere como Uint8Array.
// Anotamos el genérico <ArrayBuffer> explícitamente porque TS 5.7+ hace que
// `Uint8Array` a secas caiga en `ArrayBufferLike` (incluye SharedArrayBuffer),
// que ya no es asignable a `BufferSource` en `applicationServerKey`.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type PushSubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
};

// Arma la fila a upsertear a partir del JSON de la suscripción del navegador,
// o null si la suscripción vino incompleta (no debería pasar, pero el brief
// original ya contemplaba el chequeo).
function toSubscriptionRow(userId: string, json: PushSubscriptionJSON): PushSubscriptionRow | null {
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return {
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent,
  };
}

/**
 * Pide permiso y registra la suscripción. DEBE llamarse desde un gesto del
 * usuario (requisito de iOS/Safari), nunca al montar una pantalla.
 *
 * Implementación real de subscribeToPush(). No se exporta directamente: hay
 * varios await aquí dentro (requestPermission, serviceWorker.ready,
 * getSubscription, getUser, los dos upsert) que en teoría pueden rechazar
 * fuera de los try/catch ya existentes para pushManager.subscribe(). La red
 * final contra eso vive en el wrapper exportado subscribeToPush() de abajo.
 */
async function doSubscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (isIOS() && !isStandalonePWA()) return { ok: false, reason: 'needs_install' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();

  let subscription: PushSubscription;
  if (existing) {
    subscription = existing;
  } else {
    // pushManager.subscribe() puede rechazar (AbortError, NotAllowedError,
    // fallo del servicio push, etc.). Si eso pasa, el contrato de la función
    // es devolver { ok: false, reason } y NUNCA dejar que la promesa rechace.
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch (e) {
      console.error('[push] pushManager.subscribe (inicial):', e);
      return { ok: false, reason: 'subscribe_failed' };
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'no_session' };

  const row = toSubscriptionRow(user.id, subscription.toJSON());
  if (!row) return { ok: false, reason: 'invalid_subscription' };

  let { error } = await supabase.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });

  // Caso navegador compartido: la suscripción push del navegador es POR ORIGEN,
  // no por usuario. Si el usuario A activó notificaciones y luego cerró sesión
  // y entra el usuario B en el mismo navegador, getSubscription() devuelve el
  // MISMO endpoint que ya pertenece a A en la tabla. Como `endpoint` es UNIQUE
  // y la RLS solo deja tocar filas propias (user_id = auth.uid()), el upsert de
  // B falla en crudo con 42501 (RLS deniega la fila de A) o 23505 (choque de
  // unicidad). La única salida es forzar al navegador a emitir un endpoint
  // nuevo: desuscribimos la suscripción existente y creamos una desde cero,
  // y reintentamos el upsert UNA sola vez (sin bucles de reintento).
  if (error && (error.code === '42501' || error.code === '23505')) {
    await subscription.unsubscribe().catch(() => {});

    // En este punto la suscripción vieja YA se desuscribió. Si subscribe()
    // falla aquí, el navegador queda sin ninguna suscripción activa: no hay
    // forma de recuperarla en esta misma llamada, así que devolvemos un
    // reason y el usuario tendrá que volver a pulsar "activar notificaciones"
    // (nunca debe romperse el contrato dejando que la promesa rechace).
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch (e) {
      console.error('[push] pushManager.subscribe (reintento tras navegador compartido):', e);
      return { ok: false, reason: 'subscribe_failed' };
    }

    const retryRow = toSubscriptionRow(user.id, subscription.toJSON());
    if (!retryRow) return { ok: false, reason: 'invalid_subscription' };

    ({ error } = await supabase.from('push_subscriptions').upsert(retryRow, { onConflict: 'endpoint' }));
  }

  if (error) {
    console.error('[push] upsert suscripción:', error.message);
    return { ok: false, reason: 'db_error' };
  }
  return { ok: true };
}

/**
 * Envoltura exportada: pase lo que pase dentro de doSubscribeToPush() (un
 * await inesperado que rechace, un error de red no contemplado, etc.), el
 * llamador SIEMPRE recibe un objeto { ok, reason } y nunca una promesa
 * rechazada. Esto importa porque la UI hace
 * `const { ok, reason } = await subscribeToPush()` dentro de un onPress; si
 * la promesa rechazara, ese destructuring lanzaría como unhandled rejection
 * y el usuario se quedaría sin ningún toast ni feedback.
 */
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  try {
    return await doSubscribeToPush();
  } catch (e) {
    console.error('[push] subscribeToPush falló de forma inesperada:', e);
    return { ok: false, reason: 'unexpected_error' };
  }
}

/**
 * Reconcilia permiso concedido ↔ fila en la base de datos.
 *
 * El permiso del navegador puede seguir en 'granted' mientras la fila de
 * push_subscriptions ya no existe: send-push borra las suscripciones que el
 * push service reporta como muertas (404/410). Sin esta reconciliación el
 * usuario se queda sin notificaciones para siempre, y el banner —que solo
 * aparece con el permiso en 'default'— nunca se lo diría.
 *
 * Es silenciosa: no pide permiso ni muestra nada. Nunca rechaza.
 */
export async function ensurePushSubscription(): Promise<void> {
  try {
    if (!isPushSupported()) return;
    if (Notification.permission !== 'granted') return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    // Sin suscripción en el navegador: hay que crearla de cero.
    if (!subscription) {
      await subscribeToPush();
      return;
    }

    // Con suscripción, pero puede no estar registrada para ESTE usuario.
    // La RLS hace que el count solo vea filas propias, que es justo lo que
    // queremos comprobar.
    const { count, error } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('endpoint', subscription.endpoint)
      .eq('user_id', user.id);
    if (error) return;
    if (!count) await subscribeToPush();
  } catch (e) {
    console.error('[push] ensurePushSubscription:', e);
  }
}

async function doUnsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe().catch(() => {});
}

// Misma red que subscribeToPush(): la firma declarada es Promise<void>, así
// que un rechazo aquí también rompería el contrato para quien la llame desde
// un botón "desactivar notificaciones". Tragamos y logueamos en vez de dejar
// que se propague.
export async function unsubscribeFromPush(): Promise<void> {
  try {
    await doUnsubscribeFromPush();
  } catch (e) {
    console.error('[push] unsubscribeFromPush falló de forma inesperada:', e);
  }
}

export interface EstadoNotificaciones {
  soportado: boolean;
  ios: boolean;
  instalada: boolean;
  permiso: NotificationPermission | 'unsupported';
  /** El navegador tiene una suscripción viva. */
  suscritoEnNavegador: boolean;
  /** Esa suscripción está registrada en la base de datos para este usuario. */
  registradoEnServidor: boolean;
}

/**
 * Radiografía del estado de notificaciones de ESTE dispositivo.
 *
 * Existe porque depurar esto a distancia era imposible: si el permiso queda
 * concedido pero el registro falla, el banner se oculta (solo aparece con el
 * permiso sin decidir) y el usuario no puede ni reintentar ni decir qué pasó.
 */
export async function estadoNotificaciones(): Promise<EstadoNotificaciones> {
  const base: EstadoNotificaciones = {
    soportado: isPushSupported(),
    ios: isIOS(),
    instalada: isStandalonePWA(),
    permiso: getPushPermission(),
    suscritoEnNavegador: false,
    registradoEnServidor: false,
  };
  try {
    if (!base.soportado) return base;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    base.suscritoEnNavegador = !!subscription;
    if (!subscription) return base;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return base;
    const { count } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('endpoint', subscription.endpoint)
      .eq('user_id', user.id);
    base.registradoEnServidor = !!count;
  } catch (e) {
    console.error('[push] estadoNotificaciones:', e);
  }
  return base;
}
