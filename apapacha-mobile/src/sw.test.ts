/**
 * El service worker no se puede importar como módulo: es un script que se
 * registra sobre `self`. Aquí lo evaluamos con un `self` de mentira para poder
 * probar el manejador del click en una notificación, que es donde se decidía
 * mal a qué pantalla ir.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

type Listener = (event: any) => void;

interface ClienteFalso {
  url: string;
  focus: jest.Mock;
  navigate: jest.Mock;
  postMessage: jest.Mock;
}

function cliente(url = 'https://apapacha-mobile.vercel.app/reservas'): ClienteFalso {
  return {
    url,
    focus: jest.fn().mockResolvedValue(undefined),
    navigate: jest.fn().mockResolvedValue(undefined),
    postMessage: jest.fn(),
  };
}

function cargarSW(controlados: ClienteFalso[], sinControlar: ClienteFalso[]) {
  const listeners: Record<string, Listener> = {};
  const openWindow = jest.fn().mockResolvedValue(undefined);

  const self: any = {
    location: { origin: 'https://apapacha-mobile.vercel.app' },
    addEventListener: (tipo: string, fn: Listener) => { listeners[tipo] = fn; },
    skipWaiting: () => {},
    registration: { showNotification: jest.fn() },
    clients: {
      claim: () => Promise.resolve(),
      openWindow,
      matchAll: ({ includeUncontrolled }: any) =>
        Promise.resolve(includeUncontrolled ? [...controlados, ...sinControlar] : controlados),
    },
  };

  const codigo = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  vm.runInNewContext(codigo, {
    self,
    caches: { open: () => Promise.resolve({ addAll: () => Promise.resolve(), put: () => {} }), keys: () => Promise.resolve([]), match: () => Promise.resolve(undefined) },
    fetch: () => Promise.resolve(),
    URL,
    Response: { error: () => ({}) },
    console,
  });

  return { listeners, openWindow };
}

async function click(listeners: Record<string, Listener>, url: string) {
  const esperas: Promise<any>[] = [];
  listeners.notificationclick({
    notification: { close: jest.fn(), data: { url } },
    waitUntil: (p: Promise<any>) => esperas.push(p),
  });
  await Promise.all(esperas);
}

describe('click en una notificación push', () => {
  test('con la app abierta y controlada por el SW, le pide navegar por dentro', async () => {
    const abierto = cliente();
    const { listeners, openWindow } = cargarSW([abierto], []);

    await click(listeners, '/panel');

    expect(abierto.focus).toHaveBeenCalled();
    expect(abierto.postMessage).toHaveBeenCalledWith({ tipo: 'ir-a', url: '/panel' });
    // Nada de recargar la página ni de abrir una ventana nueva.
    expect(abierto.navigate).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  test('si la ventana no la controla el SW, navega de verdad', async () => {
    const suelto = cliente();
    const { listeners, openWindow } = cargarSW([], [suelto]);

    await click(listeners, '/panel');

    expect(suelto.focus).toHaveBeenCalled();
    expect(suelto.navigate).toHaveBeenCalledWith('/panel');
    expect(openWindow).not.toHaveBeenCalled();
  });

  /**
   * Este es el fallo que reportó la tester: navigate() rechaza en las ventanas
   * que el service worker no controla, el error se tragaba en silencio y la app
   * se quedaba en la pantalla que ya estaba abierta (Reservas de cliente) en vez
   * de abrir el panel del cuidador.
   */
  test('si navigate falla, abre una ventana en el destino en vez de quedarse callado', async () => {
    const suelto = cliente();
    suelto.navigate.mockRejectedValue(new TypeError('not controlled'));
    const { listeners, openWindow } = cargarSW([], [suelto]);

    await click(listeners, '/panel');

    expect(openWindow).toHaveBeenCalledWith('/panel');
  });

  test('sin ninguna ventana abierta, abre una nueva en el destino', async () => {
    const { listeners, openWindow } = cargarSW([], []);

    await click(listeners, '/chat/abc');

    expect(openWindow).toHaveBeenCalledWith('/chat/abc');
  });
});
