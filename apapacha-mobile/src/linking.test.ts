import { getStateFromPath } from '@react-navigation/native';
import { linking, guestLinking } from './linking';

// Devuelve el nombre de la primera ruta del estado resuelto, o null.
function routeFor(path: string, config: any): string | null {
  const state = getStateFromPath(path, config);
  return state?.routes?.[0]?.name ?? null;
}

describe('guestLinking (sin sesión)', () => {
  it('la raíz NO resuelve a MainTabs, para que se monte Login', () => {
    expect(routeFor('/', guestLinking.config)).not.toBe('MainTabs');
  });

  it('una ruta privada como /perfil no resuelve a MainTabs', () => {
    expect(routeFor('/perfil', guestLinking.config)).not.toBe('MainTabs');
  });

  it('/login resuelve a Login', () => {
    expect(routeFor('/login', guestLinking.config)).toBe('Login');
  });

  it('mantiene la navegación pública de invitado', () => {
    expect(routeFor('/explorar', guestLinking.config)).toBe('MainTabs');
    expect(routeFor('/alojamiento/abc-123', guestLinking.config)).toBe('SpaceDetail');
    expect(routeFor('/visita/abc-123', guestLinking.config)).toBe('VisiterDetail');
  });
});

describe('ninguna ruta privada es alcanzable sin sesión', () => {
  // El requisito real no es "la URL queda en /" sino "tras cerrar sesión (o al
  // navegar sin sesión) el usuario no puede quedar en una pantalla privada".
  // Para cada ruta privada, getStateFromPath debe devolver undefined: es la
  // señal que usa React Navigation para caer en el initialRouteName del stack
  // de invitado ("Login"), en vez de resolver la URL a una pantalla privada.
  const privateRoutes = [
    '/perfil',
    '/reservas',
    '/mensajes',
    '/panel',
    '/admin',
    '/notificaciones',
    '/chat/abc-123',
    '/pago/abc-123',
  ];

  it.each(privateRoutes)('%s no resuelve a ninguna pantalla (undefined) con guestLinking', (path) => {
    expect(getStateFromPath(path, guestLinking.config)).toBeUndefined();
  });
});

describe('linking (con sesión)', () => {
  it('sigue mapeando la raíz a MainTabs', () => {
    expect(routeFor('/', linking.config)).toBe('MainTabs');
  });

  it('sigue mapeando el chat', () => {
    expect(routeFor('/chat/abc-123', linking.config)).toBe('ChatDetail');
  });
});

describe('Onboarding no es alcanzable por URL', () => {
  // Regresión: /onboarding estaba en el mapa de rutas, así que bastaba con que
  // la URL se quedara ahí para que la pantalla "Cuéntanos sobre ti" volviera a
  // salir a alguien con el perfil ya completo, saltándose la lógica de arranque.
  it('/onboarding no resuelve a la pantalla de Onboarding, ni con sesión', () => {
    const state = getStateFromPath('/onboarding', linking.config);
    expect(state?.routes?.[0]?.name).not.toBe('Onboarding');
  });
});

// Los destinos que manda el service worker al tocar una notificación push
// (public.notification_url en la base). Si uno de estos no resuelve, la
// notificación deja al usuario en la pantalla que hubiera abierta: es el fallo
// que reportó la tester con el aviso de cuidador, que abría Reservas de cliente.
describe('destinos de las notificaciones push', () => {
  function target(path: string) {
    const state = getStateFromPath(path, linking.config as any);
    const raiz = state?.routes?.[state.routes.length - 1];
    return { raiz: raiz?.name, hijo: (raiz as any)?.state?.routes?.[0]?.name };
  }

  it('/panel abre el panel del cuidador, no las reservas del cliente', () => {
    expect(target('/panel')).toEqual({ raiz: 'MainTabs', hijo: 'HostDashboard' });
  });

  it('/reservas abre las reservas del cliente', () => {
    expect(target('/reservas')).toEqual({ raiz: 'MainTabs', hijo: 'Bookings' });
  });

  it('/chat/<id> abre esa conversación', () => {
    const state = getStateFromPath('/chat/abc-123', linking.config as any);
    const ruta = state?.routes?.[state.routes.length - 1];
    expect(ruta?.name).toBe('ChatDetail');
    expect((ruta?.params as any)?.id).toBe('abc-123');
  });

  it('/admin y /perfil resuelven a su pantalla', () => {
    expect(getStateFromPath('/admin', linking.config as any)?.routes?.[0]?.name).toBe('Admin');
    expect(target('/perfil')).toEqual({ raiz: 'MainTabs', hijo: 'Profile' });
  });
});
