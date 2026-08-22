import type { Notification } from '../types/database';
import { supabase } from '../../supabase';

export interface NotificationTarget { screen: string; params?: any }

// Mapea una notificación a la pantalla que la origina, para poder abrirla al tocarla.
export function notificationTarget(n: Notification): NotificationTarget | null {
  const data = (n.data ?? {}) as any;
  switch (n.type) {
    // Cuidador: nueva solicitud de reserva
    case 'booking_created':
      return { screen: 'MainTabs', params: { screen: 'HostDashboard', params: { tab: 'solicitudes' } } };

    // Admin: postulaciones, nuevos usuarios/servicios, comprobantes de pago
    case 'application_submitted':
    case 'user_registered':
    case 'service_published':
    case 'receipt_submitted':
      return { screen: 'Admin' };

    // Postulante: resultado de su postulación
    case 'application_approved':
    case 'application_rejected':
      return { screen: 'MainTabs', params: { screen: 'Profile' } };

    // Cliente/cuidador: cambios de estado de una reserva
    case 'booking_accepted':
    case 'booking_rejected':
    case 'booking_confirmed':
    case 'service_started':
    case 'service_completed':
    case 'booking_cancelled':
      return { screen: 'MainTabs', params: { screen: 'Bookings' } };

    default:
      if (data.booking_id) return { screen: 'MainTabs', params: { screen: 'Bookings' } };
      if (data.application_id) return { screen: 'MainTabs', params: { screen: 'Profile' } };
      return null;
  }
}

/**
 * Igual que `notificationTarget`, pero mirando quién recibe la notificación.
 *
 * Una misma notificación ("servicio finalizado", "reserva cancelada") le llega
 * al cliente y al cuidador, y cada uno la ve en un sitio distinto: la pestaña
 * Reservas solo lista las reservas donde eres el dueño del gato. Mandar ahí al
 * cuidador lo dejaba mirando una lista vacía sin entender por qué.
 *
 * Ante cualquier duda (sin sesión, reserva no visible, error de red) devuelve
 * el destino genérico: nunca deja al usuario sin navegar.
 */
export async function resolveNotificationTarget(n: Notification): Promise<NotificationTarget | null> {
  const base = notificationTarget(n);
  if (!base) return null;

  const bookingId = (n.data as any)?.booking_id;
  // Solo las de reserva son ambiguas; el resto tiene un único destino posible.
  if (!bookingId || base.params?.screen !== 'Bookings') return base;

  try {
    const [{ data: auth }, { data: booking }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('bookings').select('owner_id, status').eq('id', bookingId).maybeSingle(),
    ]);
    if (!auth?.user || !booking) return base;
    if (booking.owner_id === auth.user.id) return base;

    return {
      screen: 'MainTabs',
      params: {
        screen: 'HostDashboard',
        params: { tab: booking.status === 'pending' ? 'solicitudes' : 'reservas' },
      },
    };
  } catch {
    return base;
  }
}
