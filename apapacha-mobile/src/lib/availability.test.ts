import { BLOCK_HOURS, blockRange, blockOffered } from '../lib/availability';

describe('bloques horarios de una visita', () => {
  test('la mañana empieza a las 8:00 y la tarde termina a las 20:00', () => {
    expect(BLOCK_HOURS.am).toEqual({ from: 8, to: 12 });
    expect(BLOCK_HOURS.pm).toEqual({ from: 13, to: 20 });
    expect(blockRange('am')).toBe('08:00 a 12:00');
    expect(blockRange('pm')).toBe('13:00 a 20:00');
  });

  test('sin jornada declarada por el cuidador se ofrecen los dos bloques', () => {
    const av = { weekdays: [0, 1, 2, 3, 4, 5, 6], blocked_dates: [] };
    expect(blockOffered(av, 'am')).toBe(true);
    expect(blockOffered(av, 'pm')).toBe(true);
  });

  test('un cuidador que solo atiende de tarde no ofrece el bloque AM', () => {
    const av = { weekdays: [1, 2, 3, 4, 5], blocked_dates: [], from: '14:00', to: '20:00' };
    expect(blockOffered(av, 'am')).toBe(false);
    expect(blockOffered(av, 'pm')).toBe(true);
  });

  test('un cuidador que solo atiende de mañana no ofrece el bloque PM', () => {
    const av = { weekdays: [1, 2, 3, 4, 5], blocked_dates: [], from: '08:00', to: '12:00' };
    expect(blockOffered(av, 'am')).toBe(true);
    expect(blockOffered(av, 'pm')).toBe(false);
  });
});
