import { decidePushBannerState } from './pushBannerState';

describe('decidePushBannerState', () => {
  // El bug original: en Safari de iOS sin instalar, la API Notification no
  // existe, así que el guard de soporte devolvía 'oculto' y el aviso de
  // "agrégala a inicio" —escrito justo para esa plataforma— era inalcanzable.
  it('en iOS sin instalar pide instalar, aunque no haya API de notificaciones', () => {
    expect(decidePushBannerState({
      supported: false, ios: true, standalone: false, permission: 'unsupported',
    })).toBe('instalar');
  });

  it('en iOS instalado y sin decidir, pide permiso', () => {
    expect(decidePushBannerState({
      supported: true, ios: true, standalone: true, permission: 'default',
    })).toBe('pedir');
  });

  it('en iOS instalado con permiso concedido, se oculta', () => {
    expect(decidePushBannerState({
      supported: true, ios: true, standalone: true, permission: 'granted',
    })).toBe('oculto');
  });

  it('en iOS instalado con permiso denegado, se oculta', () => {
    expect(decidePushBannerState({
      supported: true, ios: true, standalone: true, permission: 'denied',
    })).toBe('oculto');
  });

  it('en escritorio sin decidir, pide permiso', () => {
    expect(decidePushBannerState({
      supported: true, ios: false, standalone: false, permission: 'default',
    })).toBe('pedir');
  });

  it('en un navegador sin soporte y que no es iOS, se oculta', () => {
    expect(decidePushBannerState({
      supported: false, ios: false, standalone: false, permission: 'unsupported',
    })).toBe('oculto');
  });
});
