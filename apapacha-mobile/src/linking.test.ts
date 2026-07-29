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
