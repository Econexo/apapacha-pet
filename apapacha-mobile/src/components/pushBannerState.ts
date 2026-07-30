export type PushBannerState = 'oculto' | 'pedir' | 'instalar';

interface Env {
  supported: boolean;
  ios: boolean;
  standalone: boolean;
  permission: NotificationPermission | 'unsupported';
}

/**
 * Decide qué mostrar en el banner de notificaciones.
 *
 * El orden importa: en Safari de iOS sin instalar, la API Notification NO
 * existe (iOS solo la expone a web apps instaladas), así que `supported` es
 * false. Si se comprueba el soporte primero, el aviso de "agrégala a inicio"
 * —el único camino para que ese usuario llegue a tener notificaciones— nunca
 * se muestra. Por eso el caso de iOS sin instalar se resuelve ANTES.
 */
export function decidePushBannerState({ supported, ios, standalone, permission }: Env): PushBannerState {
  if (ios && !standalone) return 'instalar';
  if (!supported) return 'oculto';
  return permission === 'default' ? 'pedir' : 'oculto';
}
