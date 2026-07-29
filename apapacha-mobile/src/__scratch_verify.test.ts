import { getStateFromPath } from '@react-navigation/native';
import { guestLinking } from './linking';

// Sonda temporal (no se commitea): inspecciona el estado COMPLETO que resuelve
// getStateFromPath para las URLs de la comprobación 1, 3 y 4 del Step 7.
describe('sonda temporal Step 7', () => {
  it('/ sin sesión: getStateFromPath', () => {
    const state = getStateFromPath('/', guestLinking.config);
    console.log('PATH / =>', JSON.stringify(state));
    // undefined significa que React Navigation cae al initialRouteName del
    // Stack.Navigator del guest stack (Login, fijado en App.tsx Step 2).
    expect(state).toBeUndefined();
  });

  it('/perfil sin sesión: getStateFromPath', () => {
    const state = getStateFromPath('/perfil', guestLinking.config);
    console.log('PATH /perfil =>', JSON.stringify(state));
    expect(state).toBeUndefined();
  });

  it('/explorar sin sesión: getStateFromPath', () => {
    const state = getStateFromPath('/explorar', guestLinking.config);
    console.log('PATH /explorar =>', JSON.stringify(state));
    expect(state).toBeDefined();
  });
});
