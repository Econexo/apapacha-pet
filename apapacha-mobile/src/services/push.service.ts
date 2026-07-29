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
 */
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (isIOS() && !isStandalonePWA()) return { ok: false, reason: 'needs_install' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  let subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

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
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

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

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe().catch(() => {});
}
