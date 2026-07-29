# Push, cámara/video y arreglo de la instancia PWA — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar el callejón sin salida de login/registro/cierre de sesión en la PWA instalada, y añadir notificaciones push del sistema (incluidas las de chat), cámara directa y video en el chat.

**Architecture:** Cuatro frentes independientes sobre la app Expo Web (PWA en Vercel) + Supabase. (1) El bug de auth se arregla con un mapa de rutas separado para invitados y un `signOut` que limpia la URL. (2) El push usa Web Push estándar: tabla `push_subscriptions`, handlers en el service worker, y **un solo trigger sobre `notifications`** que convierte cada notificación in-app existente en push vía pg_net → edge function `send-push`. (3) Las notificaciones de chat son un trigger sobre `messages` que inserta en `notifications`, así heredan el push del punto 2. (4) La cámara/video se centraliza en un helper + una hoja de acción reutilizable.

**Tech Stack:** Expo SDK 54 / React Native 0.81 / react-native-web, React Navigation 7, Supabase (Postgres + RLS + Storage + Edge Functions Deno), pg_net, `npm:web-push`, `expo-image-picker`, `expo-video`, Jest (`jest-expo`).

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-29-push-media-pwa-design.md`. Léelo antes de empezar.
- Directorio de la app: `apapacha-mobile/`. Todos los comandos de npm/expo se corren ahí.
- **Nunca** uses `supabase db push`: la DB remota tiene deriva de migraciones. Aplica cada archivo con `supabase db query --linked -f <archivo.sql>` desde la raíz del repo.
- Antes de asumir que una columna/constraint existe en remoto, verifícala con una consulta.
- Deploy web: `npx vercel deploy --prod` **desde `apapacha-mobile/`**. No hay auto-deploy desde GitHub.
- Deploy de edge functions: `supabase functions deploy <nombre>` desde la raíz del repo.
- Gate automático de TypeScript en cada tarea de frontend: `npx tsc --noEmit` debe salir con código 0. Hoy está limpio; si falla, es tu cambio.
- Idioma de toda la UI y los comentarios de código: **español**. Los mensajes de commit también.
- Colores y tipografía siempre desde `src/theme/colors.ts` y `src/theme/typography.ts`. Íconos: `Ionicons` de `@expo/vector-icons`. Nunca emojis en la UI (sí en los textos de notificación push, donde son útiles).
- Proyecto Supabase: `mzqvkzjxubuqpdnznigy`. URL de funciones: `https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1`.
- URL de producción: `https://apapacha-mobile.vercel.app`.
- No commitees secretos. El único secreto que tocan las migraciones es `TRIGGER_SECRET`, que va como `__TRIGGER_SECRET__` en el archivo versionado y se reemplaza solo al ejecutar.
- Commit al final de cada tarea, un commit por tarea.

---

## Mapa de archivos

**Frente 1 — Auth PWA**
- Modificar: `apapacha-mobile/src/linking.ts` (añadir `guestLinking`)
- Crear: `apapacha-mobile/src/linking.test.ts`
- Crear: `apapacha-mobile/jest.config.js`
- Modificar: `apapacha-mobile/App.tsx` (linking condicional, `initialRouteName`)
- Modificar: `apapacha-mobile/src/context/AuthContext.tsx` (`signOut` robusto)
- Crear: `apapacha-mobile/src/components/GuestGate.tsx`
- Modificar: `apapacha-mobile/src/screens/ProfileScreen.tsx`, `InboxScreen.tsx`, `BookingsScreen.tsx` (usar `GuestGate`)
- Modificar: `apapacha-mobile/src/screens/LoginScreen.tsx` ("Explorar sin cuenta")
- Modificar: `apapacha-mobile/scripts/pwa-postbuild.js` (`viewport-fit=cover` + safe areas)

**Frente 2 — Web Push**
- Crear: `supabase/migrations/20260729_push_subscriptions.sql`
- Modificar: `apapacha-mobile/public/sw.js` (handlers `push` / `notificationclick`)
- Crear: `apapacha-mobile/src/services/push.service.ts`
- Crear: `apapacha-mobile/src/components/PushPermissionBanner.tsx`
- Modificar: `apapacha-mobile/src/screens/ProfileScreen.tsx` (banner)
- Crear: `supabase/functions/send-push/index.ts`
- Crear: `supabase/migrations/20260729_push_trigger.sql`

**Frente 3 — Notificaciones de chat**
- Crear: `supabase/migrations/20260729_message_notifications.sql`
- Modificar: `apapacha-mobile/src/services/notifications.service.ts`
- Modificar: `apapacha-mobile/App.tsx` (badge en la pestaña Mensajes)
- Modificar: `apapacha-mobile/src/screens/ChatDetailScreen.tsx` (marcar leídas)

**Frente 4 — Cámara y video**
- Crear: `apapacha-mobile/src/lib/mediaPicker.ts`
- Crear: `apapacha-mobile/src/components/MediaSourceSheet.tsx`
- Modificar: `ChatDetailScreen.tsx`, `EditProfileScreen.tsx`, `AddPetScreen.tsx`, `ManageServiceScreen.tsx`, `TransferInstructionsScreen.tsx`
- Crear: `supabase/migrations/20260729_chat_video.sql`
- Modificar: `apapacha-mobile/src/services/messages.service.ts`, `src/types/database.ts`, `src/screens/InboxScreen.tsx`

---

## Task 1: Configuración de linking para invitados (+ test de regresión)

Esta es la causa raíz del bug reportado. Con `linking` activo, la URL `/` resuelve a `MainTabs > Home` incluso sin sesión, así que `Login` nunca se monta y no hay forma de registrarse desde la PWA instalada.

**Files:**
- Create: `apapacha-mobile/jest.config.js`
- Create: `apapacha-mobile/src/linking.test.ts`
- Modify: `apapacha-mobile/src/linking.ts`
- Modify: `apapacha-mobile/package.json` (script `test` + devDeps)

**Interfaces:**
- Consumes: nada.
- Produces: `export const guestLinking: LinkingOptions<RootStackParamList>` en `src/linking.ts`. `linking` sigue exportándose igual que hoy.

- [ ] **Step 1: Instalar Jest**

```bash
cd apapacha-mobile
npx expo install --dev jest-expo jest @types/jest
```

- [ ] **Step 2: Crear la configuración de Jest**

Crear `apapacha-mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
```

Añadir a `apapacha-mobile/package.json`, dentro de `"scripts"`:

```json
"test": "jest"
```

- [ ] **Step 3: Escribir el test que falla**

Crear `apapacha-mobile/src/linking.test.ts`:

```ts
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

describe('linking (con sesión)', () => {
  it('sigue mapeando la raíz a MainTabs', () => {
    expect(routeFor('/', linking.config)).toBe('MainTabs');
  });

  it('sigue mapeando el chat', () => {
    expect(routeFor('/chat/abc-123', linking.config)).toBe('ChatDetail');
  });
});
```

- [ ] **Step 4: Correr el test y verificar que falla**

Run: `cd apapacha-mobile && npx jest src/linking.test.ts`
Expected: FAIL — `guestLinking` no existe todavía (`TS2305` / `undefined`).

- [ ] **Step 5: Implementar `guestLinking`**

En `apapacha-mobile/src/linking.ts`, añadir al final del archivo:

```ts
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
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `cd apapacha-mobile && npx jest src/linking.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 7: Verificar tipos**

Run: `cd apapacha-mobile && npx tsc --noEmit`
Expected: sin salida, exit 0.

- [ ] **Step 8: Commit**

```bash
git add apapacha-mobile/jest.config.js apapacha-mobile/src/linking.test.ts apapacha-mobile/src/linking.ts apapacha-mobile/package.json apapacha-mobile/package-lock.json
git commit -m "fix(pwa): mapa de rutas separado para invitados

La URL / resolvia a MainTabs incluso sin sesion, dejando Login inalcanzable
en la PWA instalada. Añade guestLinking con solo rutas publicas + tests."
```

---

## Task 2: Cablear el linking de invitado, `signOut` robusto y puntos de entrada a Login

**Files:**
- Modify: `apapacha-mobile/App.tsx`
- Modify: `apapacha-mobile/src/context/AuthContext.tsx`
- Create: `apapacha-mobile/src/components/GuestGate.tsx`
- Modify: `apapacha-mobile/src/screens/LoginScreen.tsx`
- Modify: `apapacha-mobile/src/screens/ProfileScreen.tsx`
- Modify: `apapacha-mobile/src/screens/InboxScreen.tsx`
- Modify: `apapacha-mobile/src/screens/BookingsScreen.tsx`

**Interfaces:**
- Consumes: `guestLinking` de la Task 1.
- Produces: `<GuestGate title body />` en `src/components/GuestGate.tsx`; `useAuth().signOut()` ahora siempre deja `session === null`.

- [ ] **Step 1: Endurecer `signOut` en `AuthContext`**

En `apapacha-mobile/src/context/AuthContext.tsx`, reemplazar la función `signOut` (líneas 67-69) por:

```tsx
  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Si la llamada global falla (red caída, lock de Safari en la PWA de iOS),
      // al menos limpiamos la sesión local para no dejar al usuario atrapado.
      console.warn('[AuthContext] signOut global falló, limpiando local:', e);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } finally {
      setSession(null);
      setProfile(null);
      // Sin esto, el linking restaura /perfil y parece que no pasó nada.
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
    }
  }
```

`Platform` ya está importado en la línea 2.

- [ ] **Step 2: Usar el linking condicional y `initialRouteName` en `App.tsx`**

En `apapacha-mobile/App.tsx`:

1. Cambiar el import de la línea 45 a:

```tsx
import { linking, guestLinking } from './src/linking';
```

2. En `RootNavigator`, reemplazar el bloque `if (!session)` (líneas 150-157) por:

```tsx
  if (!session) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
        <Stack.Screen name="SpaceDetail" component={SpaceDetailScreen} />
        <Stack.Screen name="VisiterDetail" component={VisiterDetailScreen} />
        <Stack.Screen name="TrustAndSafety" component={TrustAndSafetyScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    );
  }
```

3. Extraer el `NavigationContainer` a un componente que conozca la sesión. Reemplazar el cuerpo de `App()` (a partir del `return`) por:

```tsx
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <ToastProvider>
        <AuthProvider>
          <NavigationRoot />
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

// El mapa de rutas depende de la sesión: sin ella solo se mapean rutas públicas,
// para que Login sea alcanzable (ver comentario en src/linking.ts).
function NavigationRoot() {
  const { session } = useAuth();
  return (
    <NavigationContainer
      linking={session ? linking : guestLinking}
      documentTitle={{
        formatter: (options) => (options?.title ? `${options.title} · ApapachaPet` : 'ApapachaPet'),
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}
```

- [ ] **Step 3: Crear el componente `GuestGate`**

Crear `apapacha-mobile/src/components/GuestGate.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { Button } from './ui/Button';
import { ScreenBackground } from './ui/ScreenBackground';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  title: string;
  body: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

// Estado para pantallas privadas cuando se navega sin sesión. Es el punto de
// entrada explícito a Login: antes no existía ninguno en toda la app.
export function GuestGate({ title, body, icon = 'lock-closed-outline' }: Props) {
  const navigation = useNavigation<Nav>();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <Button
          label="Iniciar sesión o crear cuenta"
          icon="log-in"
          onPress={() => navigation.navigate('Login')}
          style={{ marginTop: 8, alignSelf: 'stretch' }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.textMain, textAlign: 'center' },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
});
```

- [ ] **Step 4: Usar `GuestGate` en las tres pantallas privadas**

En `apapacha-mobile/src/screens/ProfileScreen.tsx`, `InboxScreen.tsx` y `BookingsScreen.tsx`:

1. Añadir el import `import { GuestGate } from '../components/GuestGate';`.
2. Obtener `session` del contexto (`const { session } = useAuth();` — en `InboxScreen` y `BookingsScreen` hay que añadir el import de `useAuth` desde `'../context/AuthContext'`).
3. Como **primera** sentencia del `return` del componente, antes de cualquier otra cosa:

En `ProfileScreen`:

```tsx
  if (!session) {
    return <GuestGate title="Tu perfil te espera" body="Crea tu cuenta para gestionar tus gatos, tus reservas y tu reputación en ApapachaPet." icon="person-circle-outline" />;
  }
```

En `InboxScreen`:

```tsx
  if (!session) {
    return <GuestGate title="Mensajes" body="Ingresa a tu cuenta para chatear con los cuidadores de tus reservas." icon="chatbubbles-outline" />;
  }
```

En `BookingsScreen`:

```tsx
  if (!session) {
    return <GuestGate title="Tus reservas" body="Ingresa a tu cuenta para ver el estado de tus reservas y pagos." icon="calendar-outline" />;
  }
```

Los hooks deben declararse **antes** de este `if` (regla de hooks). Colócalo justo después del último `useEffect`/`useFocusEffect` y antes del `return` principal.

- [ ] **Step 5: Añadir "Explorar sin cuenta" en `LoginScreen`**

En `apapacha-mobile/src/screens/LoginScreen.tsx`:

1. Añadir los imports:

```tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
```

2. Dentro del componente, junto a los demás hooks:

```tsx
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
```

3. Justo **después** del cierre de la card del formulario (el `</View>` que cierra `styles.card`) y antes de cerrar el `ScrollView`, añadir:

```tsx
          {/* Salida al modo invitado: con Login como ruta inicial, esta es la
              única puerta de entrada a la navegación sin cuenta. */}
          <TouchableOpacity
            style={styles.guestLink}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.7}
          >
            <Ionicons name="compass-outline" size={15} color="rgba(255,255,255,0.85)" />
            <Text style={styles.guestLinkText}>Explorar sin cuenta</Text>
          </TouchableOpacity>
```

4. Añadir a `styles`:

```tsx
  guestLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingVertical: 10 },
  guestLinkText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700' },
```

- [ ] **Step 6: Verificar tipos y tests**

Run: `cd apapacha-mobile && npx tsc --noEmit && npx jest`
Expected: exit 0, tests en verde.

- [ ] **Step 7: Verificar en el navegador**

Run: `cd apapacha-mobile && npx expo start --web`

Comprobar, en una ventana de incógnito:

1. Abrir `http://localhost:8081/` sin sesión → debe verse **Login**, no Inicio.
2. Tocar "Explorar sin cuenta" → aparece Explorar; tocar la pestaña Perfil → aparece el `GuestGate` con el botón; tocarlo → vuelve a Login.
3. Abrir `http://localhost:8081/perfil` sin sesión → debe verse **Login**.
4. Abrir `http://localhost:8081/explorar` sin sesión → debe verse **Explorar**.
5. Iniciar sesión → ir a Perfil → "Cerrar Sesión" → debe quedar en **Login** y la barra de direcciones en `/`.

- [ ] **Step 8: Commit**

```bash
git add apapacha-mobile/App.tsx apapacha-mobile/src/context/AuthContext.tsx apapacha-mobile/src/components/GuestGate.tsx apapacha-mobile/src/screens/LoginScreen.tsx apapacha-mobile/src/screens/ProfileScreen.tsx apapacha-mobile/src/screens/InboxScreen.tsx apapacha-mobile/src/screens/BookingsScreen.tsx
git commit -m "fix(pwa): Login alcanzable sin sesion y cierre de sesion efectivo

Linking condicional por sesion, initialRouteName Login, signOut que limpia
la URL y estado de invitado con CTA en Perfil/Mensajes/Reservas."
```

---

## Task 3: Safe areas y viewport en modo standalone

**Files:**
- Modify: `apapacha-mobile/scripts/pwa-postbuild.js`

**Interfaces:**
- Consumes: nada.
- Produces: `dist/index.html` con `viewport-fit=cover` y padding de safe-area en `#root`.

- [ ] **Step 1: Reemplazar el viewport generado por Expo**

En `apapacha-mobile/scripts/pwa-postbuild.js`, justo después de `let html = fs.readFileSync(INDEX, 'utf8');`, añadir:

```js
// Expo emite un viewport sin `viewport-fit=cover`. En iOS instalado (standalone)
// eso deja `env(safe-area-inset-*)` en 0 y el contenido se mete bajo la barra de
// estado y el indicador de inicio.
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover, shrink-to-fit=no" />'
);

if (!html.includes('id="pwa-safe-area"')) {
  const safeArea = `
    <style id="pwa-safe-area">
      /* En standalone no hay chrome del navegador: respetamos las safe areas. */
      #root {
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px);
        padding-right: env(safe-area-inset-right, 0px);
        box-sizing: border-box;
      }
    </style>
  `;
  html = html.replace('</head>', `${safeArea}</head>`);
}
```

- [ ] **Step 2: Ejecutar el build y verificar el HTML**

```bash
cd apapacha-mobile
npx expo export --platform web && node scripts/pwa-postbuild.js
grep -c 'viewport-fit=cover' dist/index.html
grep -c 'pwa-safe-area' dist/index.html
```

Expected: ambos `grep -c` devuelven `1`. Además, `grep -c 'shrink-to-fit=no' dist/index.html` debe devolver `1` (no dos viewports).

- [ ] **Step 3: Commit**

```bash
git add apapacha-mobile/scripts/pwa-postbuild.js
git commit -m "fix(pwa): viewport-fit=cover y safe areas en modo standalone"
```

---

## Task 4: Tabla `push_subscriptions`

**Files:**
- Create: `supabase/migrations/20260729_push_subscriptions.sql`

**Interfaces:**
- Consumes: nada.
- Produces: tabla `public.push_subscriptions(id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)` con RLS por dueño.

- [ ] **Step 1: Verificar que la tabla no existe todavía**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked "SELECT to_regclass('public.push_subscriptions') AS tabla;"
```

Expected: `tabla` = `null`.

- [ ] **Step 2: Escribir la migración**

Crear `supabase/migrations/20260729_push_subscriptions.sql`:

```sql
-- Suscripciones Web Push de cada usuario (una por navegador/dispositivo).
-- El endpoint es único: al re-suscribirse el navegador devuelve el mismo, así que
-- el upsert por endpoint evita duplicados.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint     text NOT NULL UNIQUE,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Solo el dueño toca sus suscripciones. La edge function usa service_role y
-- pasa por encima de RLS.
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 3: Aplicar la migración**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked -f supabase/migrations/20260729_push_subscriptions.sql
```

Expected: sin error.

- [ ] **Step 4: Verificar estructura y RLS**

```bash
supabase db query --linked "
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='push_subscriptions'
 ORDER BY ordinal_position;
SELECT relrowsecurity FROM pg_class WHERE relname='push_subscriptions';
SELECT polname FROM pg_policy WHERE polrelid='public.push_subscriptions'::regclass;
"
```

Expected: 8 columnas (`id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at`), `relrowsecurity = true`, una política `Users manage own push subscriptions`.

- [ ] **Step 5: Verificar que anon no lee nada**

```bash
supabase db query --linked "
SET LOCAL role anon;
SELECT count(*) AS filas_anon FROM public.push_subscriptions;
"
```

Expected: `filas_anon = 0` (o error de permisos). Nunca debe devolver filas de otros.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260729_push_subscriptions.sql
git commit -m "feat(push): tabla push_subscriptions con RLS por dueño"
```

---

## Task 5: Handlers de push en el service worker

**Files:**
- Modify: `apapacha-mobile/public/sw.js`

**Interfaces:**
- Consumes: nada.
- Produces: el SW responde a `push` con `showNotification` y a `notificationclick` con foco + deep-link. Payload esperado: `{ title, body, url, tag }`.

- [ ] **Step 1: Bumpear la caché y añadir los handlers**

En `apapacha-mobile/public/sw.js`:

1. Cambiar la primera línea de constantes a `const CACHE = 'apapacha-v2';` (invalida el shell viejo, que no tiene los handlers).
2. Añadir al final del archivo:

```js
// ─── Web Push ────────────────────────────────────────────────────────────────
// El sonido lo pone el sistema operativo (el predeterminado del dispositivo):
// la API de Web Push no permite audio propio, y es justo lo que queremos.

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'ApapachaPet', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'ApapachaPet';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Agrupa por conversación/evento: una notificación nueva reemplaza la anterior
    // del mismo tag en vez de apilarse.
    tag: payload.tag || 'apapacha',
    renotify: true,
    data: { url: payload.url || '/' },
  };

  // SIEMPRE hay que mostrar una notificación: si no, el navegador puede
  // revocar el permiso de push.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(target).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
```

- [ ] **Step 2: Verificar la sintaxis del service worker**

```bash
cd apapacha-mobile && node --check public/sw.js && echo "SW OK"
```

Expected: `SW OK`.

- [ ] **Step 3: Verificar que los handlers quedan registrados**

```bash
cd apapacha-mobile && grep -c "addEventListener('push'\|addEventListener('notificationclick'" public/sw.js
```

Expected: `2`.

- [ ] **Step 4: Commit**

```bash
git add apapacha-mobile/public/sw.js
git commit -m "feat(push): handlers push y notificationclick en el service worker"
```

---

## Task 6: Servicio de push en el cliente

Antes de esta tarea hay que generar el par VAPID (paso 1). La clave pública es pública por diseño (igual que la anon key de Supabase) y va con fallback embebido, siguiendo el patrón de `supabase.ts`.

**Files:**
- Create: `apapacha-mobile/src/services/push.service.ts`
- Modify: `apapacha-mobile/.env`

**Interfaces:**
- Consumes: tabla `push_subscriptions` (Task 4), SW con handler `push` (Task 5).
- Produces:
  - `isPushSupported(): boolean`
  - `isStandalonePWA(): boolean`
  - `isIOS(): boolean`
  - `getPushPermission(): NotificationPermission | 'unsupported'`
  - `subscribeToPush(): Promise<{ ok: boolean; reason?: string }>`
  - `unsubscribeFromPush(): Promise<void>`
  - `VAPID_PUBLIC_KEY: string`

- [ ] **Step 1: Generar el par VAPID**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
npx --yes web-push generate-vapid-keys --json
```

Guarda la salida: `publicKey` va en el código y en `.env`; `privateKey` va **solo** a los secrets de Supabase (Task 8). No commitees la privada.

- [ ] **Step 2: Añadir la clave pública a `.env`**

Añadir a `apapacha-mobile/.env` (reemplazando `<PUBLIC_KEY>` por la generada):

```
EXPO_PUBLIC_VAPID_PUBLIC_KEY=<PUBLIC_KEY>
```

- [ ] **Step 3: Crear el servicio**

Crear `apapacha-mobile/src/services/push.service.ts` (reemplazar `<PUBLIC_KEY>` por la clave generada, igual que en `.env`):

```ts
import { Platform } from 'react-native';
import { supabase } from '../../supabase';

// La clave pública VAPID es pública por diseño (viaja al navegador en cada
// suscripción), igual que la anon key. Fallback embebido para no depender de la
// configuración de env vars en Vercel.
export const VAPID_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '<PUBLIC_KEY>';

export function isPushSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// En iOS el Web Push SOLO funciona si la PWA está instalada en la pantalla de
// inicio (iOS 16.4+). En navegador normal ni siquiera se puede pedir permiso.
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as any).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// La clave VAPID viaja en base64url; PushManager la quiere como Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Pide permiso y registra la suscripción. DEBE llamarse desde un gesto del
 * usuario (requisito de iOS/Safari), nunca al montar una pantalla.
 */
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (isIOS() && !isStandalonePWA()) return { ok: false, reason: 'needs_install' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'invalid_subscription' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'no_session' };

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' }
  );
  if (error) {
    console.error('[push] upsert suscripción:', error.message);
    return { ok: false, reason: 'db_error' };
  }
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe().catch(() => {});
}
```

- [ ] **Step 4: Verificar tipos**

Run: `cd apapacha-mobile && npx tsc --noEmit`
Expected: exit 0. (Si `NotificationPermission` no se resuelve, añade `"lib": ["dom", "esnext"]` a `compilerOptions` en `tsconfig.json`.)

- [ ] **Step 5: Commit**

```bash
git add apapacha-mobile/src/services/push.service.ts apapacha-mobile/.env
git commit -m "feat(push): servicio de suscripcion Web Push en el cliente"
```

---

## Task 7: Banner de permiso de notificaciones

**Files:**
- Create: `apapacha-mobile/src/components/PushPermissionBanner.tsx`
- Modify: `apapacha-mobile/src/screens/ProfileScreen.tsx`

**Interfaces:**
- Consumes: `push.service.ts` (Task 6), `useToast()` de `../components/Toast`.
- Produces: `<PushPermissionBanner />`, sin props.

- [ ] **Step 1: Crear el banner**

Crear `apapacha-mobile/src/components/PushPermissionBanner.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import { useToast } from './Toast';
import {
  isPushSupported, isStandalonePWA, isIOS, getPushPermission, subscribeToPush,
} from '../services/push.service';

// Estados: 'oculto' (ya concedido, denegado o no soportado), 'pedir' (podemos
// pedir permiso), 'instalar' (iOS sin PWA instalada: hay que explicar el paso).
type Estado = 'oculto' | 'pedir' | 'instalar';

export function PushPermissionBanner() {
  const toast = useToast();
  const [estado, setEstado] = useState<Estado>('oculto');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return setEstado('oculto');
    if (isIOS() && !isStandalonePWA()) return setEstado('instalar');
    setEstado(getPushPermission() === 'default' ? 'pedir' : 'oculto');
  }, []);

  if (estado === 'oculto') return null;

  if (estado === 'instalar') {
    return (
      <View style={styles.banner}>
        <View style={styles.iconWrap}><Ionicons name="phone-portrait-outline" size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Activa las notificaciones</Text>
          <Text style={styles.body}>
            En iPhone necesitas agregar ApapachaPet a la pantalla de inicio: toca Compartir y luego "Agregar a inicio".
          </Text>
        </View>
      </View>
    );
  }

  const activar = async () => {
    setCargando(true);
    const { ok, reason } = await subscribeToPush();
    setCargando(false);
    if (ok) {
      setEstado('oculto');
      toast.success('Notificaciones activadas', 'Te avisaremos de mensajes y reservas.');
      return;
    }
    if (reason === 'denied') {
      setEstado('oculto');
      toast.info('Notificaciones bloqueadas', 'Puedes reactivarlas desde los ajustes del navegador.');
      return;
    }
    toast.error('No se pudo activar', 'Inténtalo de nuevo en unos segundos.');
  };

  return (
    <TouchableOpacity style={styles.banner} onPress={activar} disabled={cargando} activeOpacity={0.85}>
      <View style={styles.iconWrap}><Ionicons name="notifications-outline" size={18} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Activa las notificaciones</Text>
        <Text style={styles.body}>Recibe avisos cuando te escriban o cambie el estado de una reserva.</Text>
      </View>
      <Text style={styles.cta}>{cargando ? '...' : 'Activar'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.brandTint, borderRadius: radii.md, padding: 14, marginBottom: 16 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 15, color: colors.textMain },
  body: { fontSize: 12.5, color: colors.textMuted, lineHeight: 17, marginTop: 2 },
  cta: { fontSize: 13, fontWeight: '800', color: colors.primary },
});
```

- [ ] **Step 2: Montarlo en el perfil**

En `apapacha-mobile/src/screens/ProfileScreen.tsx`:

1. Añadir `import { PushPermissionBanner } from '../components/PushPermissionBanner';`.
2. Dentro del `<ScrollView contentContainerStyle={styles.scrollContainer}>`, como **primer** hijo:

```tsx
        <PushPermissionBanner />
```

- [ ] **Step 3: Verificar tipos**

Run: `cd apapacha-mobile && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Verificar en el navegador**

Run: `cd apapacha-mobile && npx expo start --web`

1. Iniciar sesión, ir a Perfil → el banner "Activa las notificaciones" debe aparecer.
2. Tocarlo → el navegador pide permiso → aceptar → toast de éxito y el banner desaparece.
3. Verificar la fila:

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked "SELECT user_id, left(endpoint, 45) AS endpoint, created_at FROM public.push_subscriptions ORDER BY created_at DESC LIMIT 5;"
```

Expected: al menos una fila con tu `user_id`.

- [ ] **Step 5: Commit**

```bash
git add apapacha-mobile/src/components/PushPermissionBanner.tsx apapacha-mobile/src/screens/ProfileScreen.tsx
git commit -m "feat(push): banner para activar notificaciones desde el perfil"
```

---

## Task 8: Edge Function `send-push`

**Files:**
- Create: `supabase/functions/send-push/index.ts`

**Interfaces:**
- Consumes: tabla `push_subscriptions` (Task 4), secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `TRIGGER_SECRET`.
- Produces: `POST /functions/v1/send-push` con cuerpo `{ user_id: string, title: string, body: string, url?: string, tag?: string }` y header `x-trigger-secret`. Responde `{ ok: true, sent: number, removed: number }`.

- [ ] **Step 1: Escribir la función**

Crear `supabase/functions/send-push/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trigger-secret',
};

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const TRIGGER_SECRET = Deno.env.get('TRIGGER_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

webpush.setVapidDetails('mailto:apapachapet.app@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Autorización: igual que send-email, solo los triggers de la DB (secret
  // compartido) pueden invocarla. Fail-secure si el secret no está configurado.
  const secret = req.headers.get('x-trigger-secret') ?? '';
  if (!TRIGGER_SECRET || secret !== TRIGGER_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!payload.user_id || !payload.title) {
    return new Response(JSON.stringify({ error: 'user_id y title son obligatorios' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', payload.user_id);

  if (error) {
    console.error('[send-push] lectura de suscripciones:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    url: payload.url ?? '/',
    tag: payload.tag ?? 'apapacha',
  });

  const muertas: string[] = [];
  let enviadas = 0;

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          notification
        );
        enviadas++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410 = el navegador desechó la suscripción: la borramos.
        if (status === 404 || status === 410) muertas.push(s.id);
        else console.error('[send-push] envío falló:', status, (e as Error).message);
      }
    })
  );

  if (muertas.length) {
    await admin.from('push_subscriptions').delete().in('id', muertas);
  }
  if (enviadas > 0) {
    await admin
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', payload.user_id);
  }

  return new Response(JSON.stringify({ ok: true, sent: enviadas, removed: muertas.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Cargar los secrets VAPID**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase secrets set VAPID_PUBLIC_KEY='<PUBLIC_KEY>' VAPID_PRIVATE_KEY='<PRIVATE_KEY>'
supabase secrets list
```

Expected: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `TRIGGER_SECRET` aparecen en la lista.

- [ ] **Step 3: Desplegar**

```bash
supabase functions deploy send-push
```

Expected: deploy exitoso.

- [ ] **Step 4: Verificar que rechaza sin secret**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  'https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1/send-push' \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"00000000-0000-0000-0000-000000000000","title":"test","body":"test"}'
```

Expected: `401`.

- [ ] **Step 5: Verificar el envío real**

Obtener el `TRIGGER_SECRET` desde la función existente en la DB:

```bash
supabase db query --linked "
SELECT substring(prosrc from 'v_secret text := ''([^'']+)''') AS trigger_secret
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname='private' AND p.proname='call_send_email';
"
```

Con ese valor y tu `user_id` (el de la suscripción creada en la Task 7):

```bash
curl -s -X POST 'https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1/send-push' \
  -H 'Content-Type: application/json' \
  -H 'x-trigger-secret: <TRIGGER_SECRET>' \
  -d '{"user_id":"<TU_USER_ID>","title":"Prueba ApapachaPet","body":"Notificación de prueba","url":"/perfil","tag":"test"}'
```

Expected: `{"ok":true,"sent":1,"removed":0}` **y** la notificación aparece en el dispositivo con el sonido del sistema.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-push/index.ts
git commit -m "feat(push): edge function send-push con VAPID y limpieza de suscripciones muertas"
```

---

## Task 9: Trigger que convierte cada notificación in-app en push

**Files:**
- Create: `supabase/migrations/20260729_push_trigger.sql`

**Interfaces:**
- Consumes: `send-push` (Task 8), tabla `notifications` (existente).
- Produces: `private.call_send_push(payload jsonb)`, `public.notification_url(p_type text, p_data jsonb) RETURNS text`, trigger `trg_push_on_notification` sobre `public.notifications`.

- [ ] **Step 1: Verificar que el trigger no existe y ver el patrón vigente**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked "
SELECT tgname FROM pg_trigger WHERE tgrelid='public.notifications'::regclass AND NOT tgisinternal;
SELECT extname FROM pg_extension WHERE extname='pg_net';
"
```

Expected: sin trigger `trg_push_on_notification`; `pg_net` presente (ya se instaló para los emails).

- [ ] **Step 2: Escribir la migración**

Crear `supabase/migrations/20260729_push_trigger.sql`. **Antes de ejecutarla**, reemplaza `__TRIGGER_SECRET__` por el valor real (el mismo que usa `private.call_send_email`, obtenible con la consulta de la Task 8 Step 5). El archivo se commitea con el placeholder.

```sql
-- Puente notificaciones in-app → Web Push.
--
-- Decisión de diseño: el trigger cuelga de `notifications`, no de cada evento de
-- negocio. Así TODA notificación existente (reserva aceptada, pago confirmado,
-- postulación, avisos a admins) se vuelve push sin tocar los demás triggers, y
-- las futuras lo heredan gratis.

CREATE OR REPLACE FUNCTION private.call_send_push(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_url    text := 'https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1';
  v_secret text := '__TRIGGER_SECRET__';
BEGIN
  PERFORM net.http_post(
    url     := v_url || '/send-push',
    body    := payload,   -- jsonb (NO ::text: net.http_post espera jsonb)
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'x-trigger-secret', v_secret
               )
  );
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear la transacción principal si el push falla
  RAISE WARNING '[send-push] pg_net call failed: %', SQLERRM;
END;
$fn$;

-- Traduce tipo + data de la notificación al path de la app.
-- Espejo de src/lib/notificationRoute.ts sobre los paths de src/linking.ts.
CREATE OR REPLACE FUNCTION public.notification_url(p_type text, p_data jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE
    WHEN p_type = 'new_message' AND p_data ? 'booking_id'
      THEN '/chat/' || (p_data->>'booking_id')
    WHEN p_type = 'booking_created'
      THEN '/panel'
    WHEN p_type IN ('application_submitted', 'user_registered', 'service_published', 'receipt_submitted')
      THEN '/admin'
    WHEN p_type IN ('application_approved', 'application_rejected')
      THEN '/perfil'
    WHEN p_type IN ('booking_accepted', 'booking_rejected', 'booking_confirmed',
                    'service_started', 'service_completed', 'booking_cancelled')
      THEN '/reservas'
    WHEN p_data ? 'booking_id'
      THEN '/reservas'
    WHEN p_data ? 'application_id'
      THEN '/perfil'
    ELSE '/'
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  PERFORM private.call_send_push(jsonb_build_object(
    'user_id', NEW.user_id,
    'title',   NEW.title,
    'body',    NEW.body,
    'url',     public.notification_url(NEW.type, COALESCE(NEW.data, '{}'::jsonb)),
    -- Agrupa por conversación cuando aplica; si no, por tipo.
    'tag',     COALESCE('chat-' || (NEW.data->>'booking_id'), NEW.type)
  ));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[push_on_notification] %', SQLERRM;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_push_on_notification ON public.notifications;
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.push_on_notification();
```

**Ojo con el `tag`:** para `new_message` el `COALESCE` produce `chat-<booking_id>`; para el resto, `NEW.type`. Si `data` no trae `booking_id`, `'chat-' || NULL` es `NULL` y el `COALESCE` cae al tipo — que es justo lo buscado.

- [ ] **Step 3: Verificar el mapa de URLs antes de tocar el trigger**

Copia la migración a un archivo temporal con el secret real y aplícala:

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
SECRET=$(supabase db query --linked --output json "SELECT substring(prosrc from 'v_secret text := ''([^'']+)''') AS s FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname='call_send_email';" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['s'])")
sed "s/__TRIGGER_SECRET__/$SECRET/" supabase/migrations/20260729_push_trigger.sql > /tmp/push_trigger.sql
supabase db query --linked -f /tmp/push_trigger.sql
rm /tmp/push_trigger.sql
```

Expected: sin error.

- [ ] **Step 4: Verificar la función de URLs**

```bash
supabase db query --linked "
SELECT public.notification_url('new_message', '{\"booking_id\":\"abc\"}'::jsonb) AS chat,
       public.notification_url('booking_created', '{}'::jsonb)                  AS panel,
       public.notification_url('receipt_submitted', '{}'::jsonb)                AS admin,
       public.notification_url('booking_accepted', '{}'::jsonb)                 AS reservas,
       public.notification_url('cualquier_otro', '{}'::jsonb)                   AS raiz;
"
```

Expected: `/chat/abc`, `/panel`, `/admin`, `/reservas`, `/`.

- [ ] **Step 5: Verificar el push end-to-end desde la DB**

Con la suscripción de la Task 7 activa y el dispositivo/navegador a la vista:

```bash
supabase db query --linked "
INSERT INTO public.notifications (user_id, type, title, body, data)
VALUES ('<TU_USER_ID>', 'booking_accepted', 'Prueba de push', 'Si ves esto, el trigger funciona', '{}'::jsonb)
RETURNING id;
"
```

Expected: llega la notificación al dispositivo con sonido del sistema; al tocarla abre `/reservas`.

Verificar también la respuesta HTTP de pg_net:

```bash
supabase db query --linked "SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 3;"
```

Expected: `status_code = 200` y `content` con `{"ok":true,"sent":1,...}`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260729_push_trigger.sql
git commit -m "feat(push): trigger que convierte cada notificacion in-app en Web Push"
```

---

## Task 10: Notificaciones de chat

**Files:**
- Create: `supabase/migrations/20260729_message_notifications.sql`

**Interfaces:**
- Consumes: trigger de push (Task 9), tablas `messages`, `bookings`, `spaces`, `visiters`, `notifications`.
- Produces: trigger `trg_notify_on_new_message` sobre `public.messages`; notificaciones de `type = 'new_message'` con `data = {"booking_id": ...}`.

- [ ] **Step 1: Verificar el estado actual**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked "
SELECT tgname FROM pg_trigger WHERE tgrelid='public.messages'::regclass AND NOT tgisinternal;
SELECT count(*) AS notificaciones_de_chat FROM public.notifications WHERE type='new_message';
"
```

Expected: ningún trigger de notificación; `notificaciones_de_chat = 0` (hoy el chat no avisa: ese es el bug).

- [ ] **Step 2: Escribir la migración**

Crear `supabase/migrations/20260729_message_notifications.sql`:

```sql
-- Avisa a la contraparte cuando llega un mensaje de chat.
-- Inserta en `notifications`, así hereda el Web Push de trg_push_on_notification.

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_booking     public.bookings%ROWTYPE;
  v_host_id     uuid;
  v_destino     uuid;
  v_titulo      text;
  v_cuerpo      text;
  v_existente   uuid;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = NEW.booking_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Host del servicio (service_id es polimórfico según service_type).
  IF v_booking.service_type = 'space' THEN
    SELECT host_id, title INTO v_host_id, v_titulo FROM public.spaces WHERE id = v_booking.service_id;
  ELSE
    SELECT host_id, name  INTO v_host_id, v_titulo FROM public.visiters WHERE id = v_booking.service_id;
  END IF;

  -- El destinatario es siempre el OTRO participante.
  IF NEW.sender_id = v_booking.owner_id THEN
    v_destino := v_host_id;
  ELSE
    v_destino := v_booking.owner_id;
  END IF;

  IF v_destino IS NULL OR v_destino = NEW.sender_id THEN RETURN NEW; END IF;

  v_cuerpo := CASE
    WHEN NEW.content IS NOT NULL AND btrim(NEW.content) <> '' THEN left(NEW.content, 80)
    WHEN NEW.video_url IS NOT NULL THEN '🎥 Video'
    WHEN NEW.image_url IS NOT NULL THEN '📷 Foto'
    ELSE 'Nuevo mensaje'
  END;

  -- Anti-spam: si ya hay una notificación de este chat sin leer y reciente
  -- (< 5 min), la actualizamos en vez de insertar. El push solo se dispara en el
  -- INSERT, así que una ráfaga de mensajes no genera una ráfaga de pushes, pero
  -- un mensaje horas después sí vuelve a avisar.
  SELECT id INTO v_existente
    FROM public.notifications
   WHERE user_id = v_destino
     AND type = 'new_message'
     AND read = false
     AND data->>'booking_id' = NEW.booking_id::text
     AND created_at > now() - interval '5 minutes'
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_existente IS NOT NULL THEN
    UPDATE public.notifications
       SET body = v_cuerpo, created_at = now()
     WHERE id = v_existente;
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_destino,
      'new_message',
      COALESCE(v_titulo, 'Nuevo mensaje'),
      v_cuerpo,
      jsonb_build_object('booking_id', NEW.booking_id)
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca impedir el envío de un mensaje por un fallo de notificación.
  RAISE WARNING '[notify_on_new_message] %', SQLERRM;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();
```

**Dependencia:** la función referencia `NEW.video_url`, que se crea en la Task 14. Si ejecutas esta tarea antes, aplica primero solo el `ALTER TABLE` de la Task 14 Step 2 (`ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS video_url text;`); es idempotente y no rompe nada.

- [ ] **Step 3: Aplicar la migración**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked "ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS video_url text;"
supabase db query --linked -f supabase/migrations/20260729_message_notifications.sql
```

Expected: sin error.

- [ ] **Step 4: Verificar el destinatario correcto**

Tomar una reserva real con host y owner distintos:

```bash
supabase db query --linked "
SELECT b.id AS booking_id, b.owner_id,
       COALESCE(s.host_id, v.host_id) AS host_id
  FROM public.bookings b
  LEFT JOIN public.spaces   s ON b.service_type='space'   AND s.id = b.service_id
  LEFT JOIN public.visiters v ON b.service_type='visiter' AND v.id = b.service_id
 WHERE COALESCE(s.host_id, v.host_id) IS NOT NULL
 LIMIT 1;
"
```

Insertar un mensaje como si lo enviara el owner y comprobar que la notificación queda para el host:

```bash
supabase db query --linked "
INSERT INTO public.messages (booking_id, sender_id, content)
VALUES ('<BOOKING_ID>', '<OWNER_ID>', 'Mensaje de prueba del trigger');
SELECT user_id, type, title, body, data FROM public.notifications
 WHERE type='new_message' ORDER BY created_at DESC LIMIT 1;
"
```

Expected: una fila con `user_id = <HOST_ID>` (no el owner), `body = 'Mensaje de prueba del trigger'`, `data->>'booking_id' = <BOOKING_ID>`.

- [ ] **Step 5: Verificar la agrupación anti-spam**

```bash
supabase db query --linked "
INSERT INTO public.messages (booking_id, sender_id, content) VALUES ('<BOOKING_ID>', '<OWNER_ID>', 'segundo');
INSERT INTO public.messages (booking_id, sender_id, content) VALUES ('<BOOKING_ID>', '<OWNER_ID>', 'tercero');
SELECT count(*) AS pendientes, max(body) AS ultimo
  FROM public.notifications
 WHERE type='new_message' AND read=false AND data->>'booking_id'='<BOOKING_ID>';
"
```

Expected: `pendientes = 1` (no 3) y `ultimo = 'tercero'`.

- [ ] **Step 6: Limpiar los datos de prueba**

```bash
supabase db query --linked "
DELETE FROM public.messages WHERE content IN ('Mensaje de prueba del trigger','segundo','tercero');
DELETE FROM public.notifications WHERE type='new_message' AND body IN ('Mensaje de prueba del trigger','segundo','tercero');
"
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260729_message_notifications.sql
git commit -m "feat(chat): notificar a la contraparte cuando llega un mensaje"
```

---

## Task 11: Badge de mensajes sin leer

**Files:**
- Modify: `apapacha-mobile/src/services/notifications.service.ts`
- Modify: `apapacha-mobile/App.tsx`
- Modify: `apapacha-mobile/src/screens/ChatDetailScreen.tsx`

**Interfaces:**
- Consumes: notificaciones `type='new_message'` (Task 10).
- Produces:
  - `getUnreadMessageCount(): Promise<number>`
  - `markChatNotificationsRead(bookingId: string): Promise<void>`

- [ ] **Step 1: Añadir las funciones al servicio**

Añadir al final de `apapacha-mobile/src/services/notifications.service.ts`:

```ts
// Cuenta las notificaciones de chat sin leer (badge de la pestaña Mensajes).
export async function getUnreadMessageCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'new_message')
    .eq('read', false);
  if (error) return 0;
  return count ?? 0;
}

// Marca como leídas las notificaciones de un chat concreto (al abrirlo).
export async function markChatNotificationsRead(bookingId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('type', 'new_message')
    .eq('read', false)
    .eq('data->>booking_id', bookingId);
}
```

- [ ] **Step 2: Pintar el badge en la pestaña Mensajes**

En `apapacha-mobile/App.tsx`:

1. Añadir imports:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { getUnreadMessageCount } from './src/services/notifications.service';
import { supabase } from './supabase';
```

(`React` ya está disponible; usa `React.useState` si prefieres no añadir el import de hooks.)

2. Dentro de `MainTabs`, junto a `const isHost = ...`:

```tsx
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  const refreshUnread = useCallback(() => {
    getUnreadMessageCount().then(setUnreadMsgs).catch(() => {});
  }, []);

  useEffect(() => {
    refreshUnread();
    // La tabla notifications ya está en la publicación supabase_realtime.
    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refreshUnread)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [refreshUnread]);
```

3. Cambiar la `Tab.Screen` de Inbox por:

```tsx
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ title: 'Mensajes', tabBarBadge: unreadMsgs > 0 ? unreadMsgs : undefined }}
      />
```

- [ ] **Step 3: Marcar como leídas al abrir un chat**

En `apapacha-mobile/src/screens/ChatDetailScreen.tsx`:

1. Añadir al import de servicios:

```tsx
import { markChatNotificationsRead } from '../services/notifications.service';
```

2. Añadir un `useEffect` después del que carga los mensajes (línea ~64):

```tsx
  // Al abrir el chat, sus notificaciones dejan de estar pendientes.
  useEffect(() => {
    markChatNotificationsRead(bookingId).catch(() => {});
  }, [bookingId, messages.length]);
```

- [ ] **Step 4: Verificar tipos y tests**

Run: `cd apapacha-mobile && npx tsc --noEmit && npx jest`
Expected: exit 0.

- [ ] **Step 5: Verificar en el navegador**

Con dos sesiones (una en incógnito) sobre la misma reserva:

1. El usuario A envía un mensaje → en B aparece el badge sobre la pestaña Mensajes (sin recargar) **y** llega la notificación push.
2. B abre el chat → el badge desaparece.
3. A envía 3 mensajes seguidos → B recibe **una** notificación, no tres.

- [ ] **Step 6: Commit**

```bash
git add apapacha-mobile/src/services/notifications.service.ts apapacha-mobile/App.tsx apapacha-mobile/src/screens/ChatDetailScreen.tsx
git commit -m "feat(chat): badge de mensajes sin leer y marcado al abrir el chat"
```

---

## Task 12: Helper de medios y hoja de acción

**Files:**
- Create: `apapacha-mobile/src/lib/mediaPicker.ts`
- Create: `apapacha-mobile/src/components/MediaSourceSheet.tsx`

**Interfaces:**
- Consumes: `expo-image-picker`.
- Produces:
  - `type MediaSource = 'camera' | 'library'`
  - `pickImage(source: MediaSource, opts?: { aspect?: [number, number]; allowsEditing?: boolean; quality?: number }): Promise<string | null>`
  - `pickVideo(source: MediaSource, opts?: { maxDurationSec?: number }): Promise<{ uri: string; duration?: number } | null>`
  - `<MediaSourceSheet visible kind onClose onPick />` con `kind: 'image' | 'video'` y `onPick: (source: MediaSource) => void`

- [ ] **Step 1: Crear el helper**

Crear `apapacha-mobile/src/lib/mediaPicker.ts`:

```ts
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type MediaSource = 'camera' | 'library';

// En web los permisos son no-op: expo-image-picker crea un <input type="file">
// (con `capture` para la cámara) y el permiso lo pide el propio navegador.
async function ensurePermission(source: MediaSource): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status } =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

interface ImageOpts {
  aspect?: [number, number];
  allowsEditing?: boolean;
  quality?: number;
}

/** Devuelve la URI local de la imagen elegida, o null si se canceló. */
export async function pickImage(source: MediaSource, opts: ImageOpts = {}): Promise<string | null> {
  if (!(await ensurePermission(source))) return null;
  const common = {
    quality: opts.quality ?? 0.8,
    allowsEditing: opts.allowsEditing ?? false,
    ...(opts.aspect ? { aspect: opts.aspect } : {}),
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...common, mediaTypes: ['images'] as ImagePicker.MediaType[] })
      : await ImagePicker.launchImageLibraryAsync({ ...common, mediaTypes: ['images'] as ImagePicker.MediaType[] });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

/** Devuelve la URI y duración del video elegido, o null si se canceló. */
export async function pickVideo(
  source: MediaSource,
  opts: { maxDurationSec?: number } = {}
): Promise<{ uri: string; duration?: number } | null> {
  if (!(await ensurePermission(source))) return null;
  const common = {
    quality: 0.7,
    videoMaxDuration: opts.maxDurationSec ?? 60,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...common, mediaTypes: ['videos'] as ImagePicker.MediaType[] })
      : await ImagePicker.launchImageLibraryAsync({ ...common, mediaTypes: ['videos'] as ImagePicker.MediaType[] });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, duration: asset.duration ?? undefined };
}
```

- [ ] **Step 2: Crear la hoja de acción**

Crear `apapacha-mobile/src/components/MediaSourceSheet.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import type { MediaSource } from '../lib/mediaPicker';

interface Props {
  visible: boolean;
  kind: 'image' | 'video';
  onClose: () => void;
  onPick: (source: MediaSource) => void;
}

// Hoja de acción para elegir entre cámara y galería. Antes cada pantalla iba
// directo a la galería, así que no se podía capturar en el momento.
export function MediaSourceSheet({ visible, kind, onClose, onPick }: Props) {
  const opciones: { source: MediaSource; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] =
    kind === 'image'
      ? [
          { source: 'camera',  label: 'Tomar foto',           icon: 'camera-outline' },
          { source: 'library', label: 'Elegir de la galería', icon: 'images-outline' },
        ]
      : [
          { source: 'camera',  label: 'Grabar video',         icon: 'videocam-outline' },
          { source: 'library', label: 'Elegir de la galería', icon: 'film-outline' },
        ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{kind === 'image' ? 'Agregar foto' : 'Agregar video'}</Text>
          {opciones.map((o) => (
            <TouchableOpacity
              key={o.source}
              style={styles.option}
              onPress={() => { onClose(); onPick(o.source); }}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}><Ionicons name={o.icon} size={20} color={colors.primary} /></View>
              <Text style={styles.optionText}>{o.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  title: { fontFamily: fonts.display, fontSize: 17, color: colors.textMain, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textMain },
  cancel: { marginTop: 14, paddingVertical: 13, borderRadius: radii.md, backgroundColor: colors.background, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
});
```

- [ ] **Step 3: Verificar tipos**

Run: `cd apapacha-mobile && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apapacha-mobile/src/lib/mediaPicker.ts apapacha-mobile/src/components/MediaSourceSheet.tsx
git commit -m "feat(media): helper de camara/galeria y hoja de accion reutilizable"
```

---

## Task 13: Cámara directa en las pantallas que suben fotos

**Files:**
- Modify: `apapacha-mobile/src/screens/EditProfileScreen.tsx`
- Modify: `apapacha-mobile/src/screens/AddPetScreen.tsx`
- Modify: `apapacha-mobile/src/screens/ManageServiceScreen.tsx`
- Modify: `apapacha-mobile/src/screens/TransferInstructionsScreen.tsx`

**Interfaces:**
- Consumes: `pickImage`, `MediaSource` de `src/lib/mediaPicker.ts` y `<MediaSourceSheet />` (Task 12).
- Produces: nada nuevo.

- [ ] **Step 1: `EditProfileScreen` (avatar)**

En `apapacha-mobile/src/screens/EditProfileScreen.tsx`:

1. Reemplazar `import * as ImagePicker from 'expo-image-picker';` por:

```tsx
import { pickImage, type MediaSource } from '../lib/mediaPicker';
import { MediaSourceSheet } from '../components/MediaSourceSheet';
```

2. Añadir el estado de la hoja junto a los demás `useState`:

```tsx
  const [sheetVisible, setSheetVisible] = useState(false);
```

3. Reemplazar el cuerpo de la función que hoy abre la galería (líneas ~32-45) por:

```tsx
  const handlePickAvatar = async (source: MediaSource) => {
    const uri = await pickImage(source, { allowsEditing: true, aspect: [1, 1] });
    if (!uri) return;
    await subirAvatar(uri);   // el resto del flujo de subida que ya existía
  };
```

Extrae a `subirAvatar(uri: string)` todo lo que la función hacía después de obtener `result.assets[0].uri` (subida a storage + update de perfil), sin cambiar esa lógica.

4. Cambiar el `onPress` del botón de avatar a `() => setSheetVisible(true)` y renderizar la hoja al final del árbol del componente:

```tsx
      <MediaSourceSheet
        visible={sheetVisible}
        kind="image"
        onClose={() => setSheetVisible(false)}
        onPick={handlePickAvatar}
      />
```

- [ ] **Step 2: `AddPetScreen` (foto del gato)**

En `apapacha-mobile/src/screens/AddPetScreen.tsx` ya existen dos botones separados (galería en ~74-85, cámara en ~87-90). Unificarlos:

1. Reemplazar el import de `expo-image-picker` por los de `mediaPicker` + `MediaSourceSheet` (igual que en el paso 1).
2. Sustituir ambas funciones por una sola:

```tsx
  const handlePickPhoto = async (source: MediaSource) => {
    const uri = await pickImage(source, { allowsEditing: true, aspect: [1, 1] });
    if (!uri) return;
    setImageUri(uri);   // usa el mismo setter que ya tenían ambas funciones
  };
```

3. Dejar **un** botón "Agregar foto" que abre la hoja (`setSheetVisible(true)`) y montar `<MediaSourceSheet kind="image" ... onPick={handlePickPhoto} />`.

- [ ] **Step 3: `ManageServiceScreen` (fotos del servicio, 2 puntos de subida)**

En `apapacha-mobile/src/screens/ManageServiceScreen.tsx` hay dos llamadas a la galería (~111-120 y ~215-225). Para cada una:

1. Reemplazar el import por los de `mediaPicker` + `MediaSourceSheet`.
2. Añadir estado que recuerde qué botón abrió la hoja:

```tsx
  const [sheetTarget, setSheetTarget] = useState<'principal' | 'galeria' | null>(null);
```

3. Convertir cada handler a recibir la fuente:

```tsx
  const handlePickServicePhoto = async (source: MediaSource) => {
    const target = sheetTarget;
    setSheetTarget(null);
    const uri = await pickImage(source, { quality: 0.8 });
    if (!uri || !target) return;
    if (target === 'principal') await subirFotoPrincipal(uri);
    else await subirFotoGaleria(uri);
  };
```

donde `subirFotoPrincipal` / `subirFotoGaleria` son extracciones literales de la lógica de subida que ya existe tras obtener la URI en cada punto.

4. Los botones pasan a `onPress={() => setSheetTarget('principal')}` / `('galeria')`, y se monta una sola hoja:

```tsx
      <MediaSourceSheet
        visible={sheetTarget !== null}
        kind="image"
        onClose={() => setSheetTarget(null)}
        onPick={handlePickServicePhoto}
      />
```

- [ ] **Step 4: `TransferInstructionsScreen` (comprobante de pago)**

En `apapacha-mobile/src/screens/TransferInstructionsScreen.tsx` (galería en ~73-80): mismo patrón que el paso 1 — import, `sheetVisible`, handler `handlePickReceipt(source)` que llama `pickImage(source, { quality: 0.8 })` y luego la lógica de subida existente, botón que abre la hoja, y `<MediaSourceSheet kind="image" ... />`.

Este es el punto donde tomar la foto del comprobante en el momento tiene más valor.

- [ ] **Step 5: Verificar tipos y tests**

Run: `cd apapacha-mobile && npx tsc --noEmit && npx jest`
Expected: exit 0.

- [ ] **Step 6: Verificar en el navegador**

Run: `cd apapacha-mobile && npx expo start --web`

En cada pantalla (Editar perfil, Agregar gato, Gestionar servicio, Comprobante de transferencia): tocar el botón de foto → aparece la hoja con "Tomar foto" y "Elegir de la galería"; ambas abren un selector de archivos y la imagen elegida se sube igual que antes.

En escritorio "Tomar foto" abre el selector normal (el atributo `capture` solo tiene efecto en móvil); la verificación real de cámara va en la Task 15 sobre el iPhone.

- [ ] **Step 7: Commit**

```bash
git add apapacha-mobile/src/screens/EditProfileScreen.tsx apapacha-mobile/src/screens/AddPetScreen.tsx apapacha-mobile/src/screens/ManageServiceScreen.tsx apapacha-mobile/src/screens/TransferInstructionsScreen.tsx
git commit -m "feat(media): opcion de tomar foto con la camara en perfil, gatos, servicios y comprobantes"
```

---

## Task 14: Foto con cámara y video en el chat

**Files:**
- Create: `supabase/migrations/20260729_chat_video.sql`
- Modify: `apapacha-mobile/src/types/database.ts`
- Modify: `apapacha-mobile/src/services/messages.service.ts`
- Modify: `apapacha-mobile/src/screens/ChatDetailScreen.tsx`
- Modify: `apapacha-mobile/package.json` (expo-video)

**Interfaces:**
- Consumes: `pickImage`, `pickVideo`, `MediaSourceSheet` (Task 12); bucket `chat-media` (ya existe).
- Produces:
  - `Message.video_url?: string | null`
  - `uploadChatVideo(bookingId: string, localUri: string): Promise<string>`
  - `sendMessage(bookingId: string, content: string, imageUrl?: string, videoUrl?: string): Promise<void>`
  - `CHAT_VIDEO_MAX_BYTES = 25 * 1024 * 1024`, `CHAT_VIDEO_MAX_SECONDS = 60`

- [ ] **Step 1: Escribir la migración**

Crear `supabase/migrations/20260729_chat_video.sql`:

```sql
-- Videos en el chat. Mismo ciclo de vida que las fotos: viven lo que dura el
-- chat de la reserva y se purgan al completarla o cancelarla.

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS video_url text;

-- Límite de 25 MB y tipos permitidos en el bucket (antes solo imágenes).
UPDATE storage.buckets
   SET file_size_limit = 26214400,
       allowed_mime_types = ARRAY[
         'image/jpeg','image/png','image/webp','image/heic',
         'video/mp4','video/quicktime','video/webm'
       ]
 WHERE id = 'chat-media';

-- La purga existente solo desvinculaba image_url; ahora también video_url.
CREATE OR REPLACE FUNCTION public.purge_chat_media_on_end()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.messages
       SET image_url = NULL, video_url = NULL
     WHERE booking_id = NEW.id AND (image_url IS NOT NULL OR video_url IS NOT NULL);
  END IF;
  RETURN NEW;
END;
$$;
```

Las políticas RLS del bucket ya son por participante y cubren video sin cambios.

- [ ] **Step 2: Aplicar y verificar la migración**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked -f supabase/migrations/20260729_chat_video.sql
supabase db query --linked "
SELECT column_name FROM information_schema.columns
 WHERE table_schema='public' AND table_name='messages' AND column_name='video_url';
SELECT file_size_limit, allowed_mime_types FROM storage.buckets WHERE id='chat-media';
"
```

Expected: existe `video_url`; `file_size_limit = 26214400` y `allowed_mime_types` incluye `video/mp4`.

- [ ] **Step 3: Instalar expo-video**

```bash
cd apapacha-mobile
npx expo install expo-video
```

- [ ] **Step 4: Extender el tipo `Message`**

En `apapacha-mobile/src/types/database.ts`, dentro de `interface Message`, después de `image_url`:

```ts
  video_url?: string | null;
```

- [ ] **Step 5: Extender el servicio de mensajes**

En `apapacha-mobile/src/services/messages.service.ts`:

1. Reemplazar `sendMessage` por:

```ts
export async function sendMessage(
  bookingId: string,
  content: string,
  imageUrl?: string,
  videoUrl?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('messages').insert({
    booking_id: bookingId,
    sender_id: user.id,
    content,
    ...(imageUrl && { image_url: imageUrl }),
    ...(videoUrl && { video_url: videoUrl }),
  });
  if (error) throw error;
}
```

2. Añadir después de `uploadChatImage`:

```ts
export const CHAT_VIDEO_MAX_BYTES = 25 * 1024 * 1024;   // 25 MB (límite del bucket)
export const CHAT_VIDEO_MAX_SECONDS = 60;

// Sube un video al chat. Mismo esquema de carpetas que las fotos, así la purga
// por reserva (purgeChatMedia) lo borra sin cambios.
export async function uploadChatVideo(bookingId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  if (blob.size > CHAT_VIDEO_MAX_BYTES) {
    throw new Error('VIDEO_DEMASIADO_GRANDE');
  }
  const ext = blob.type?.includes('quicktime') ? 'mov' : blob.type?.includes('webm') ? 'webm' : 'mp4';
  const path = `${bookingId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, blob, { contentType: blob.type || 'video/mp4', upsert: true });
  if (error) throw error;
  return supabase.storage.from('chat-media').getPublicUrl(path).data.publicUrl;
}
```

- [ ] **Step 6: Componente de burbuja de video**

Crear el componente al final de `apapacha-mobile/src/screens/ChatDetailScreen.tsx`, antes de `const styles`:

```tsx
// Burbuja de video. expo-video funciona en web y nativo; si el player falla,
// queda el enlace para abrirlo aparte.
function ChatVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  return <VideoView style={styles.chatVideo} player={player} allowsFullscreen nativeControls />;
}
```

Y añadir el import arriba:

```tsx
import { VideoView, useVideoPlayer } from 'expo-video';
```

- [ ] **Step 7: Cablear la hoja de acción y el envío en el chat**

En `apapacha-mobile/src/screens/ChatDetailScreen.tsx`:

1. Reemplazar `import * as ImagePicker from 'expo-image-picker';` por:

```tsx
import { pickImage, pickVideo, type MediaSource } from '../lib/mediaPicker';
import { MediaSourceSheet } from '../components/MediaSourceSheet';
```

2. Ampliar el import de servicios:

```tsx
import {
  getMessages, sendMessage, subscribeToMessages, uploadChatImage, uploadChatVideo,
  CHAT_VIDEO_MAX_SECONDS,
} from '../services/messages.service';
```

3. Añadir estado y usar el toast:

```tsx
  const [sheetKind, setSheetKind] = useState<'image' | 'video' | null>(null);
  const toast = useToast();
```

(con `import { useToast } from '../components/Toast';`)

4. Reemplazar `handlePickImage` (líneas 78-98) por:

```tsx
  const handlePickMedia = async (source: MediaSource) => {
    const kind = sheetKind;
    setSheetKind(null);
    if (uploading || !kind) return;

    if (kind === 'image') {
      const uri = await pickImage(source, { quality: 0.7 });
      if (!uri) return;
      setUploading(true);
      try {
        const url = await uploadChatImage(bookingId, uri);
        await sendMessage(bookingId, '', url);
      } catch (e) {
        console.error('Error subiendo foto al chat:', e);
        toast.error('No se pudo enviar la foto', 'Inténtalo de nuevo.');
      } finally {
        setUploading(false);
      }
      return;
    }

    const video = await pickVideo(source, { maxDurationSec: CHAT_VIDEO_MAX_SECONDS });
    if (!video) return;
    if (video.duration && video.duration / 1000 > CHAT_VIDEO_MAX_SECONDS) {
      toast.error('Video muy largo', `El máximo son ${CHAT_VIDEO_MAX_SECONDS} segundos.`);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadChatVideo(bookingId, video.uri);
      await sendMessage(bookingId, '', undefined, url);
    } catch (e: any) {
      console.error('Error subiendo video al chat:', e);
      if (e?.message === 'VIDEO_DEMASIADO_GRANDE') {
        toast.error('Video muy pesado', 'El máximo son 25 MB. Graba uno más corto.');
      } else {
        toast.error('No se pudo enviar el video', 'Inténtalo de nuevo.');
      }
    } finally {
      setUploading(false);
    }
  };
```

5. En la barra de entrada (líneas ~143-148), sustituir el único botón por dos:

```tsx
          <TouchableOpacity style={styles.attachButton} onPress={() => setSheetKind('image')} disabled={uploading} activeOpacity={0.7}>
            {uploading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="camera-outline" size={22} color={colors.primary} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachButton} onPress={() => setSheetKind('video')} disabled={uploading} activeOpacity={0.7}>
            <Ionicons name="videocam-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
```

6. En el render de mensajes (líneas ~128-136), anteponer la rama de video:

```tsx
                {msg.video_url ? (
                  <ChatVideo uri={msg.video_url} />
                ) : msg.image_url ? (
```

(el resto de la cadena queda igual).

7. Montar la hoja dentro del `KeyboardAvoidingView`, como último hijo:

```tsx
        <MediaSourceSheet
          visible={sheetKind !== null}
          kind={sheetKind ?? 'image'}
          onClose={() => setSheetKind(null)}
          onPick={handlePickMedia}
        />
```

8. Añadir el estilo:

```tsx
  chatVideo: { width: 240, height: 240, borderRadius: 16, backgroundColor: colors.surfaceAlt },
```

- [ ] **Step 8: Verificar tipos y tests**

Run: `cd apapacha-mobile && npx tsc --noEmit && npx jest`
Expected: exit 0.

- [ ] **Step 9: Verificar en el navegador**

Run: `cd apapacha-mobile && npx expo start --web`

Abrir un chat de una reserva real:

1. Botón de cámara → hoja → "Elegir de la galería" → la foto se envía y se ve.
2. Botón de video → hoja → elegir un video corto → se sube y se reproduce con controles.
3. Elegir un video de más de 25 MB → toast "Video muy pesado", sin mensaje a medias en el chat.
4. Verificar en la DB:

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked "SELECT id, left(video_url, 60) AS video, created_at FROM public.messages WHERE video_url IS NOT NULL ORDER BY created_at DESC LIMIT 3;"
```

Expected: la fila del video enviado.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/20260729_chat_video.sql apapacha-mobile/src/types/database.ts apapacha-mobile/src/services/messages.service.ts apapacha-mobile/src/screens/ChatDetailScreen.tsx apapacha-mobile/package.json apapacha-mobile/package-lock.json
git commit -m "feat(chat): camara directa y videos (grabar o subir) en el chat"
```

---

## Task 15: Preview de video en Mensajes, despliegue y verificación en iPhone

**Files:**
- Modify: `apapacha-mobile/src/screens/InboxScreen.tsx`

**Interfaces:**
- Consumes: `messages.video_url` (Task 14).
- Produces: nada nuevo.

- [ ] **Step 1: Mostrar "Video" en el último mensaje**

En `apapacha-mobile/src/screens/InboxScreen.tsx`:

1. En la consulta de mensajes (línea ~53), añadir `video_url` al `select`:

```tsx
      supabase.from('messages').select('booking_id, content, created_at, image_url, video_url').in('booking_id', bookingIds).order('created_at', { ascending: false }),
```

2. En el armado de `msgMap` (línea ~59), cambiar el contenido por:

```tsx
      if (!msgMap[m.booking_id]) msgMap[m.booking_id] = {
        content: m.content?.trim() ? m.content : (m.video_url ? '🎥 Video' : m.image_url ? '📷 Foto' : ''),
        created_at: m.created_at,
      };
```

- [ ] **Step 2: Verificar tipos y tests**

Run: `cd apapacha-mobile && npx tsc --noEmit && npx jest`
Expected: exit 0.

- [ ] **Step 3: Build de producción**

```bash
cd apapacha-mobile
npx expo export --platform web && node scripts/pwa-postbuild.js
grep -c "addEventListener('push'" dist/sw.js
grep -c 'viewport-fit=cover' dist/index.html
```

Expected: ambos `1` (el SW con los handlers y el viewport llegaron a `dist/`).

- [ ] **Step 4: Desplegar**

```bash
cd apapacha-mobile
npx vercel deploy --prod
```

- [ ] **Step 5: Verificación en iPhone (la que motivó todo el trabajo)**

En un iPhone real, **con la PWA agregada a la pantalla de inicio** (Compartir → Agregar a inicio) y abriéndola desde ahí:

1. Sin sesión: la app abre en **Login** (antes abría en Inicio sin salida). Crear una cuenta nueva → llega el correo de confirmación.
2. Iniciar sesión → Perfil → tocar "Cerrar Sesión" → vuelve a **Login**.
3. Perfil → banner "Activa las notificaciones" → aceptar el permiso de iOS.
4. Desde otro dispositivo, escribir en un chat compartido → **llega la notificación con el sonido predeterminado del iPhone**; al tocarla abre ese chat.
5. En el chat: botón de cámara → "Tomar foto" → se abre la **cámara del iPhone**, la foto se envía.
6. Botón de video → "Grabar video" → se abre la cámara en modo video, el video se envía y se reproduce.
7. La lista de Mensajes muestra "🎥 Video" como último mensaje.

Si el paso 4 no llega: revisar `supabase functions logs send-push` y `SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 5;`.

- [ ] **Step 6: Commit**

```bash
git add apapacha-mobile/src/screens/InboxScreen.tsx
git commit -m "feat(chat): preview de video en la lista de mensajes"
```

---

## Resumen de pasos manuales (una sola vez)

1. **Task 6 Step 1** — generar el par VAPID (`npx web-push generate-vapid-keys --json`).
2. **Task 8 Step 2** — cargar `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` como secrets de Supabase.
3. **Task 9 Step 3** — reemplazar `__TRIGGER_SECRET__` al aplicar la migración (el archivo se commitea con el placeholder).
4. **Task 15 Step 5** — verificación final en un iPhone con la PWA instalada.
