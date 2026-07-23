import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types/navigation';

// Mapea rutas ↔ URL para que la web tenga direcciones reales: al refrescar,
// React Navigation restaura la pantalla actual (antes volvía siempre a Inicio),
// y habilita deep-links (p. ej. desde una notificación).
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['https://apapacha-mobile.vercel.app', 'apapachapet://'],
  config: {
    screens: {
      Login: 'login',
      Onboarding: 'onboarding',
      SetPassword: 'set-password',
      ClientVerification: 'verificacion',
      Admin: 'admin',
      MainTabs: {
        screens: {
          Home: '',
          Explore: 'explorar',
          Inbox: 'mensajes',
          Bookings: 'reservas',
          HostDashboard: 'panel',
          Profile: 'perfil',
        },
      },
      SearchModal: 'buscar',
      SpaceDetail: 'alojamiento/:id',
      VisiterDetail: 'visita/:id',
      Checkout: 'reservar/:type/:id',
      TransferInstructions: 'pago/:bookingId',
      PaymentSuccess: 'pago-exitoso/:bookingId',
      CheckIn: 'checkin/:bookingId',
      ChatDetail: 'chat/:id',
      AddPetModal: 'agregar-gato',
      HostOnboarding: 'ser-cuidador',
      TrustAndSafety: 'confianza',
      HostDashboard: 'cuidador',
      InsuranceClaim: 'reportar-incidente',
      EditProfile: 'editar-perfil',
      LeaveReview: 'calificar/:bookingId',
      ManageService: 'gestionar-servicio',
      Notifications: 'notificaciones',
    },
  },
};
