import type { Ionicons } from '@expo/vector-icons';

export type TourTargetKey = 'tab-Explore' | 'tab-Inbox' | 'tab-Bookings' | 'tab-Profile';

export interface TourStep {
  key: string;
  title: string;
  body: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Elemento real de la app que se resalta, si aplica. */
  target?: TourTargetKey;
}

// Guía de primer uso. Los pasos sin `target` son tarjetas centradas; los que lo
// tienen resaltan el elemento real de la interfaz.
export const TOUR_STEPS: TourStep[] = [
  {
    key: 'bienvenida',
    title: 'Bienvenido a ApapachaPet',
    body: 'Te mostramos en un minuto cómo encontrar cuidadores para tu gato y cómo funciona una reserva de principio a fin.',
    icon: 'paw',
  },
  {
    key: 'explorar',
    title: 'Busca cuidadores',
    body: 'Aquí encuentras alojamientos y visitas a domicilio. Puedes filtrar por fechas, zona y características del servicio.',
    icon: 'compass',
    target: 'tab-Explore',
  },
  {
    key: 'reservar',
    title: 'Cómo funciona una reserva',
    body: 'Envías la solicitud, el cuidador la acepta, subes el comprobante de la transferencia y nosotros confirmamos el pago. Recién ahí queda confirmada.',
    icon: 'calendar',
    target: 'tab-Bookings',
  },
  {
    key: 'chat',
    title: 'Coordina por el chat',
    body: 'Cada reserva tiene su chat con el cuidador. Ahí pueden mandarse fotos y videos de tu gato durante el cuidado.',
    icon: 'chatbubbles',
    target: 'tab-Inbox',
  },
  {
    key: 'estado',
    title: 'Sigue a tu gato',
    body: 'Con el servicio en curso, el cuidador te envía reportes del estado de tu gato y los ves en tu inicio.',
    icon: 'heart',
  },
  {
    key: 'notificaciones',
    title: 'Activa las notificaciones',
    body: 'Desde tu perfil puedes activarlas para enterarte al instante de mensajes, reservas y reportes. En iPhone, agrega la app a tu pantalla de inicio primero.',
    icon: 'notifications',
    target: 'tab-Profile',
  },
];
