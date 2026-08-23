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
      // Onboarding NO se mapea a una URL: es un paso único que decide el
      // estado del perfil, no un destino compartible. Mapearlo hacía que la
      // pantalla volviera a salir con solo tener la URL en /onboarding.
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

// Mapa de rutas para usuarios SIN sesión. Solo incluye pantallas públicas.
//
// Por qué existe: el stack sin sesión registra Login y MainTabs en el mismo
// navegador. Con el mapa completo, la URL "/" resolvía a MainTabs > Home, así que
// Login NUNCA se montaba: en la PWA instalada (start_url "/") no había forma de
// registrarse, y tras cerrar sesión la URL /perfil volvía a montar el perfil, con
// lo que el botón "Cerrar Sesión" parecía no hacer nada.
//
// Al dejar fuera del mapa las rutas privadas, React Navigation cae en el
// initialRouteName del stack ("Login"), que es el comportamiento correcto.
export const guestLinking: LinkingOptions<RootStackParamList> = {
  prefixes: linking.prefixes,
  config: {
    screens: {
      Login: 'login',
      // Pública a propósito: al enlace de "restablecer contraseña" se llega sin
      // sesión activa, así que si el evento PASSWORD_RECOVERY todavía no se ha
      // procesado la URL tiene que resolver igual a esta pantalla y no a Login.
      SetPassword: 'set-password',
      MainTabs: {
        screens: {
          Explore: 'explorar',
        },
      },
      SpaceDetail: 'alojamiento/:id',
      VisiterDetail: 'visita/:id',
      TrustAndSafety: 'confianza',
    },
  },
};
