import type { Notification } from '../types/database';

// Mapea una notificación a la pantalla que la origina, para poder abrirla al tocarla.
export function notificationTarget(n: Notification): { screen: string; params?: any } | null {
  const data = (n.data ?? {}) as any;
  switch (n.type) {
    // Cuidador: nueva solicitud de reserva
    case 'booking_created':
      return { screen: 'MainTabs', params: { screen: 'HostDashboard' } };

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
