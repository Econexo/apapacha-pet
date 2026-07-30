# Segunda tanda de correcciones — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar seis problemas reportados por el dueño del producto tras la primera tanda: recuperación de contraseña inservible, reservas que nunca se cierran, falta del correo en Cuenta, un "estado del gato" que era dato inventado, el banner de notificaciones inalcanzable en Safari de iOS, y el icono de la PWA que sale mal al instalar.

**Architecture:** Seis frentes independientes. Cinco son correcciones de causa raíz ya diagnosticada; el sexto (estado del gato) sustituye UI falsa por una función real de extremo a extremo (tabla + reporte del cuidador + vista del dueño + notificación).

**Tech Stack:** Expo SDK 54 / React Native 0.81 / react-native-web, React Navigation 7, Supabase (Postgres + RLS + Storage + Edge Functions + pg_cron o Vercel Cron), Jest (`jest-expo`), Pillow (para los iconos).

## Global Constraints

- Directorio de la app: `apapacha-mobile/`. Los comandos de npm/expo se corren ahí; los de `supabase`, desde la raíz del repo.
- **Nunca** `supabase db push`: la DB remota tiene deriva de migraciones. Aplica cada archivo con `supabase db query --linked -f <archivo.sql>`.
- Gate automático: `npx tsc --noEmit` y `npx jest` desde `apapacha-mobile/` deben salir con código 0.
- Idioma de UI, comentarios y mensajes de commit: **español**.
- Colores desde `src/theme/colors.ts`, tipografía desde `src/theme/typography.ts`, radios/sombras desde `src/theme/design.ts`. Íconos `Ionicons`. Sin emojis en la UI nueva.
- Proyecto Supabase: `mzqvkzjxubuqpdnznigy`. Funciones: `https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1`.
- Deploy web: `npx vercel deploy --prod` desde `apapacha-mobile/`. **No despliegues**: el deploy se hace al final, una sola vez, tras la revisión.
- El entorno auto-commitea cada edición y puede fragmentar commits o dejar marcadores de conflicto. Nunca `git reset`, nunca reescribir historial, nunca force-push. Si aparece `<<<<<<<`, parar y reportar BLOCKED.
- No crear archivos temporales dentro del repo; usar `/tmp`.
- **Ya existe** infraestructura de notificaciones: cualquier INSERT en `public.notifications` dispara un Web Push automáticamente (trigger `trg_push_on_notification`). Para avisar a alguien, basta insertar ahí.

## Causas raíz (diagnóstico ya hecho, no re-investigar)

| # | Síntoma | Causa raíz |
|---|---------|-----------|
| 1 | El enlace de restablecer no deja cambiar la contraseña | Nadie maneja el evento `PASSWORD_RECOVERY` de Supabase. `SetPasswordScreen` y la ruta `set-password` existen, pero nada navega ahí: el enlace solo inicia sesión y deja al usuario en Inicio. |
| 2 | Una reserva sigue `active` días después | `host.service.completeBookingAsHost` es el **único** camino a `status='completed'`. No hay nada que cierre la reserva cuando pasa `end_date`. |
| 3 | Cuenta no muestra correo ni contraseña | Nunca se implementó. El correo está en `useAuth().user.email`. La contraseña **no se puede mostrar** (hash en el servidor); lo correcto es una acción "Cambiar contraseña". |
| 4 | "Estado actual: Feliz" que el cuidador no puede fijar | `getMoodForPet()` en `HomeScreen.tsx` devuelve `MOOD_STATES[pet.id.charCodeAt(2) % 5]`: dato **fabricado** a partir del UUID del gato. No hay columna, ni pantalla, ni nada. Energía/estrés también son fijos. |
| 5 | No aparece el banner de notificaciones | Orden de guards en `PushPermissionBanner`: `isPushSupported()` exige `'Notification' in window`, que es **falso en Safari de iOS sin instalar** (la API solo existe en web apps instaladas). Devuelve `false` → estado `'oculto'` → la rama `'instalar'` es inalcanzable justo en la plataforma para la que se escribió. |
| 6 | Al instalar, no aparece el logo | Los tres PNG de `public/icons/` tienen píxeles transparentes (alpha 0 en las esquinas; el arte es un cuadrado blanco con esquinas redondeadas transparentes). iOS compone la transparencia del `apple-touch-icon` sobre **negro**, así que el icono sale con esquinas negras o ilegible. Los archivos existen y se sirven con 200: el problema es el canal alfa. |
| 7 | El cuidador no había marcado "Iniciar" y al cliente le salía en curso | `HomeScreen.tsx:92` define `isActive = nextBooking?.status === 'active'` y con eso rotula "Servicio en curso", "🟢 En curso" y la alerta "Tu cuidador está con tus gatos". Pero `status='active'` significa **confirmada y pagada**, no en curso: el inicio real lo marca `service_phase` (`'not_started'` → `'in_progress'`, que pone `host.service.ts:105`). `BookingsScreen.tsx:275` sí lo distingue bien ("Reserva activa · por iniciar" vs "Cuidado en curso"); Inicio es la pantalla que miente. |

## Decisiones tomadas por el dueño del producto

- **Estado del gato:** hacerlo real — el cuidador reporta ánimo + nota + foto opcional, el dueño lo ve en Inicio y recibe notificación.
- **Cierre de reserva:** cierre automático 24 h después de `end_date`, avisando antes al cuidador. Se mantiene el botón "Completar".
- **Banner:** el dueño lo buscó en Safari sin instalar la app, lo que confirma la causa raíz #5. No hay un segundo bug que perseguir.

---

## Mapa de archivos

**Task 1 — Recuperación de contraseña**
- Modificar: `src/context/AuthContext.tsx` (exponer `passwordRecovery`), `App.tsx` (forzar `SetPassword`), `src/screens/SetPasswordScreen.tsx` (variantes), `src/types/navigation.ts` (param), `src/services/auth.service.ts` (`redirectTo`), `src/linking.ts` (`set-password` en `guestLinking`)

**Task 2 — Cierre automático de reservas**
- Crear: `supabase/migrations/20260730_autocomplete_bookings.sql`

**Task 3 — Cuenta: correo y cambiar contraseña**
- Modificar: `src/screens/ProfileScreen.tsx`

**Task 4 — Estado real del gato**
- Crear: `supabase/migrations/20260730_pet_reports.sql`, `src/services/petReports.service.ts`, `src/components/PetReportSheet.tsx`
- Modificar: `src/screens/HostDashboardScreen.tsx`, `src/screens/HomeScreen.tsx`, `src/types/database.ts`

**Task 5 — Orden de guards del banner**
- Crear: `src/components/pushBannerState.ts`, `src/components/pushBannerState.test.ts`
- Modificar: `src/components/PushPermissionBanner.tsx`

**Task 6 — Iconos opacos**
- Modificar: `public/icons/apple-touch-icon.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `scripts/pwa-postbuild.js`

---

## Task 1: Recuperación de contraseña funcional

**Files:**
- Modify: `apapacha-mobile/src/context/AuthContext.tsx`
- Modify: `apapacha-mobile/App.tsx`
- Modify: `apapacha-mobile/src/screens/SetPasswordScreen.tsx`
- Modify: `apapacha-mobile/src/types/navigation.ts`
- Modify: `apapacha-mobile/src/services/auth.service.ts`
- Modify: `apapacha-mobile/src/linking.ts`

**Interfaces:**
- Consumes: `useAuth()` (hoy expone `user, session, profile, loading, signOut, refreshProfile`).
- Produces: `useAuth().passwordRecovery: boolean` y `useAuth().clearPasswordRecovery(): void`; `SetPassword: { variant?: 'onboarding' | 'recovery' | 'change' }` en `RootStackParamList`.

- [ ] **Step 1: Exponer el estado de recuperación en `AuthContext`**

En `apapacha-mobile/src/context/AuthContext.tsx`:

1. Añadir al `interface AuthContextValue`:

```tsx
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
```

y al objeto por defecto del `createContext`: `passwordRecovery: false, clearPasswordRecovery: () => {},`.

2. Añadir el estado junto a los demás `useState`:

```tsx
  const [passwordRecovery, setPasswordRecovery] = useState(false);
```

3. Dentro de `onAuthStateChange`, **antes** de `setSession(session)`, marcar el evento:

```tsx
      // Supabase emite PASSWORD_RECOVERY cuando la sesión viene del enlace de
      // "restablecer contraseña". Sin esto el enlace solo iniciaba sesión y
      // dejaba al usuario en Inicio, sin ninguna forma de cambiar la clave.
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
```

4. Exponer en el `value` del provider: `passwordRecovery`, y `clearPasswordRecovery: () => setPasswordRecovery(false)`.

5. En `signOut`, dentro del `finally`, añadir `setPasswordRecovery(false);` (para no quedar atrapado en la pantalla si se cierra sesión a mitad del flujo).

- [ ] **Step 2: Forzar la pantalla en `App.tsx`**

En `RootNavigator`, cambiar la desestructuración a `const { session, profile, passwordRecovery } = useAuth();` y, dentro de `getInitialRoute()`, poner como **primera** condición:

```tsx
    // El enlace de recuperación tiene que aterrizar en SetPassword, no en Inicio.
    if (passwordRecovery) return 'SetPassword';
```

Y en la `Stack.Screen` de `SetPassword`, pasar la variante por defecto:

```tsx
      <Stack.Screen name="SetPassword" component={SetPasswordWrapper} options={{ animation: 'slide_from_right' }} />
```

con un wrapper junto a los demás wrappers del archivo:

```tsx
function SetPasswordWrapper() {
  const route = useRoute<RouteProp<RootStackParamList, 'SetPassword'>>();
  const { passwordRecovery } = useAuth();
  // Sin variante explícita: si venimos del enlace de recuperación es 'recovery',
  // si no es el paso de onboarding.
  return <SetPasswordScreen variant={route.params?.variant ?? (passwordRecovery ? 'recovery' : 'onboarding')} />;
}
```

- [ ] **Step 3: Variantes en `SetPasswordScreen`**

En `apapacha-mobile/src/types/navigation.ts`, cambiar la línea de `SetPassword` a:

```ts
  SetPassword: { variant?: 'onboarding' | 'recovery' | 'change' } | undefined;
```

En `apapacha-mobile/src/screens/SetPasswordScreen.tsx`:

1. Firma: `export function SetPasswordScreen({ variant = 'onboarding' }: { variant?: 'onboarding' | 'recovery' | 'change' })`.
2. Obtener `clearPasswordRecovery` de `useAuth()`.
3. En `handleSet`, tras el `updateUser` exitoso y antes de navegar:

```tsx
      clearPasswordRecovery();
      toast.success(
        variant === 'onboarding' ? 'Contraseña creada' : 'Contraseña actualizada',
        'Ya puedes usarla para ingresar.',
      );
```

4. El botón de omitir (`handleSkip`) **solo** debe renderizarse cuando `variant === 'onboarding'`: en recuperación y en cambio de contraseña no tiene sentido (y en recuperación dejaría al usuario sin cambiarla).
5. Ajustar los textos según la variante: título `'Crea tu contraseña'` / `'Restablece tu contraseña'` / `'Cambiar contraseña'`, y el subtítulo acorde. Mantén el resto del formulario igual (mínimo 8 caracteres, confirmación).
6. En `variant === 'change'`, tras guardar, `navigation.goBack()` en vez de `navigation.replace('MainTabs')`.

- [ ] **Step 4: Que el enlace aterrice en la ruta correcta**

En `apapacha-mobile/src/services/auth.service.ts`, cambiar el `redirectTo` de `resetPassword`:

```ts
    redirectTo: 'https://apapacha-mobile.vercel.app/set-password',
```

En `apapacha-mobile/src/linking.ts`, añadir `SetPassword: 'set-password'` a `guestLinking.config.screens`, para que si la sesión aún no está lista la URL no caiga en Login.

**Por qué ambas cosas y no solo una:** el evento `PASSWORD_RECOVERY` es el mecanismo principal (funciona aunque la URL se limpie); el `redirectTo` y el mapa de rutas son la red de seguridad si el evento no llega a tiempo.

- [ ] **Step 5: Verificar**

Run: `cd apapacha-mobile && npx tsc --noEmit && npx jest`
Expected: exit 0 en ambos. Los 14 tests de `linking.test.ts` siguen pasando: comprueba que añadir `set-password` a `guestLinking` **no** rompe el test de que ninguna ruta privada es alcanzable sin sesión (la ruta de recuperación es intencionalmente pública, porque el usuario llega sin sesión activa; si el test la reclama, añade `set-password` a la lista de rutas públicas esperadas del test con un comentario explicando por qué).

Run: `cd apapacha-mobile && npx expo start --web`, y abre `http://localhost:8081/set-password` sin sesión: debe renderizar la pantalla de contraseña, no Login.

- [ ] **Step 6: Commit**

```bash
git add apapacha-mobile/src/context/AuthContext.tsx apapacha-mobile/App.tsx apapacha-mobile/src/screens/SetPasswordScreen.tsx apapacha-mobile/src/types/navigation.ts apapacha-mobile/src/services/auth.service.ts apapacha-mobile/src/linking.ts
git commit -m "fix(auth): el enlace de restablecer contrasena ahora lleva a SetPassword

Nadie manejaba el evento PASSWORD_RECOVERY: el enlace solo iniciaba sesion y
dejaba al usuario en Inicio sin forma de cambiar la clave."
```

---

## Task 2: Cierre automático de reservas vencidas

**Files:**
- Create: `supabase/migrations/20260730_autocomplete_bookings.sql`

**Interfaces:**
- Consumes: `public.bookings`, `public.notifications` (insertar ahí ya dispara push).
- Produces: `public.autocomplete_stale_bookings() RETURNS integer` (devuelve cuántas cerró) y su programación horaria.

- [ ] **Step 1: Comprobar el estado actual**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked "
SELECT id, status, end_date, service_phase FROM public.bookings
 WHERE status='active' AND end_date < now() - interval '24 hours'
 ORDER BY end_date;
SELECT installed_version FROM pg_available_extensions WHERE name='pg_cron';
"
```

Expected: una o más reservas vencidas (el bug reportado), y `pg_cron` con `installed_version` en `null` (disponible pero no instalada).

- [ ] **Step 2: Escribir la migración**

Crear `supabase/migrations/20260730_autocomplete_bookings.sql`:

```sql
-- Cierre automático de reservas vencidas.
--
-- Problema: completeBookingAsHost era el ÚNICO camino a status='completed'.
-- Si el cuidador no tocaba "Completar", la reserva quedaba activa para siempre
-- (reportado con reservas de días de antigüedad).
--
-- Política acordada: a las 24 h de end_date se cierra sola. Antes de eso, en
-- cuanto end_date pasa, se le avisa al cuidador para que la cierre él.

CREATE OR REPLACE FUNCTION public.autocomplete_stale_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_booking record;
  v_host_id uuid;
  v_cerradas integer := 0;
BEGIN
  -- 1) Aviso al cuidador: venció pero aún está dentro del periodo de gracia.
  --    Una sola vez por reserva (no repetir si ya se avisó).
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'active'
       AND b.end_date < now()
       AND b.end_date >= now() - interval '24 hours'
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.type = 'booking_pending_completion'
            AND n.data->>'booking_id' = b.id::text
       )
  LOOP
    SELECT COALESCE(s.host_id, v.host_id) INTO v_host_id
      FROM (SELECT 1) dummy
      LEFT JOIN public.spaces   s ON v_booking.service_type = 'space'   AND s.id = v_booking.service_id
      LEFT JOIN public.visiters v ON v_booking.service_type = 'visiter' AND v.id = v_booking.service_id;

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_host_id,
        'booking_pending_completion',
        'Marca la reserva como completada',
        'El servicio ya terminó. Si no la cierras, se cerrará sola en 24 horas.',
        jsonb_build_object('booking_id', v_booking.id)
      );
    END IF;
  END LOOP;

  -- 2) Cierre automático pasado el periodo de gracia.
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'active'
       AND b.end_date < now() - interval '24 hours'
  LOOP
    UPDATE public.bookings
       SET status = 'completed', service_phase = 'not_started'
     WHERE id = v_booking.id;

    v_cerradas := v_cerradas + 1;

    SELECT COALESCE(s.host_id, v.host_id) INTO v_host_id
      FROM (SELECT 1) dummy
      LEFT JOIN public.spaces   s ON v_booking.service_type = 'space'   AND s.id = v_booking.service_id
      LEFT JOIN public.visiters v ON v_booking.service_type = 'visiter' AND v.id = v_booking.service_id;

    -- Avisamos a ambas partes: el cierre habilita las reseñas.
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_booking.owner_id,
      'service_completed',
      'Cuidado finalizado',
      'Tu reserva se cerró automáticamente. Ya puedes calificar a tu cuidador.',
      jsonb_build_object('booking_id', v_booking.id)
    );

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_host_id,
        'service_completed',
        'Reserva cerrada automáticamente',
        'Pasaron 24 horas del fin del servicio. Ya puedes calificar al cliente.',
        jsonb_build_object('booking_id', v_booking.id)
      );
    END IF;
  END LOOP;

  RETURN v_cerradas;
END;
$fn$;

-- Solo el servicio la ejecuta (cron / edge function). Nadie más.
REVOKE ALL ON FUNCTION public.autocomplete_stale_bookings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.autocomplete_stale_bookings() FROM anon, authenticated;
```

- [ ] **Step 3: Aplicar y probar la función en seco**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
supabase db query --linked -f supabase/migrations/20260730_autocomplete_bookings.sql
```

Probar dentro de una transacción con ROLLBACK, para ver qué haría sin cambiar nada:

```bash
supabase db query --linked "
BEGIN;
SELECT public.autocomplete_stale_bookings() AS cerradas;
SELECT id, status FROM public.bookings WHERE end_date < now() - interval '24 hours';
SELECT user_id, type, title FROM public.notifications ORDER BY created_at DESC LIMIT 6;
ROLLBACK;
"
```

Expected: `cerradas` ≥ 1, las reservas vencidas en `completed`, y notificaciones nuevas de tipo `service_completed` (y `booking_pending_completion` si hay alguna dentro de la ventana de gracia). Tras el `ROLLBACK`, nada cambió.

- [ ] **Step 4: Programar la ejecución**

Intenta pg_cron primero:

```bash
supabase db query --linked "CREATE EXTENSION IF NOT EXISTS pg_cron;"
supabase db query --linked "
SELECT cron.schedule('autocompletar-reservas', '17 * * * *', \$\$SELECT public.autocomplete_stale_bookings();\$\$);
SELECT jobid, schedule, command FROM cron.job;
"
```

Expected: el job aparece en `cron.job` con schedule `17 * * * *` (cada hora al minuto 17).

**Si `CREATE EXTENSION pg_cron` falla por permisos** (es posible en Supabase gestionado): no insistas por SQL. Documenta el fallo en el reporte y usa el plan B: crear `supabase/functions/run-maintenance/index.ts` — una edge function protegida por `x-trigger-secret` que llame a `autocomplete_stale_bookings()` con el cliente `service_role` — y añadir a `apapacha-mobile/vercel.json` un cron de Vercel que la invoque una vez al día:

```json
  "crons": [{ "path": "/api/maintenance", "schedule": "0 5 * * *" }]
```

En ese caso avisa en el reporte de que el plan B necesita además una ruta `/api/maintenance` y que la periodicidad baja a diaria (el plan Hobby de Vercel solo permite crons diarios), y **pregunta antes de construirlo**: es un cambio de arquitectura que el dueño debe conocer.

- [ ] **Step 5: Ejecutar de verdad y verificar**

```bash
supabase db query --linked "SELECT public.autocomplete_stale_bookings() AS cerradas;"
supabase db query --linked "
SELECT count(*) AS activas_vencidas FROM public.bookings
 WHERE status='active' AND end_date < now() - interval '24 hours';
"
```

Expected: `activas_vencidas = 0` después de correrla. Esto cierra la reserva que el dueño reportó.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260730_autocomplete_bookings.sql
git commit -m "feat(reservas): cierre automatico 24h despues de end_date con aviso previo al cuidador"
```

---

## Task 3: Correo y cambio de contraseña en Cuenta

**Files:**
- Modify: `apapacha-mobile/src/screens/ProfileScreen.tsx`

**Interfaces:**
- Consumes: `useAuth().user.email`; ruta `SetPassword` con `variant: 'change'` (Task 1).
- Produces: nada nuevo.

- [ ] **Step 1: Añadir las filas a la sección "Cuenta y Legal"**

En `apapacha-mobile/src/screens/ProfileScreen.tsx`, dentro del `View` con `style={styles.settingsMenu}` de la sección "Cuenta y Legal", como **primeras** filas (antes de "Métodos de Pago"):

```tsx
          {/* El correo es el identificador de la cuenta: se muestra, no se edita
              (cambiarlo requiere re-verificación por email). La contraseña NO se
              puede mostrar: está hasheada en el servidor. */}
          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>Correo</Text>
            <Text style={styles.menuItemValue} numberOfLines={1}>{user?.email ?? '—'}</Text>
          </View>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SetPassword', { variant: 'change' })}>
            <Text style={styles.menuItemText}>Cambiar contraseña</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
```

Añadir `user` a la desestructuración de `useAuth()`, y el estilo:

```tsx
  menuItemValue: { fontSize: 13, color: colors.textMuted, maxWidth: '55%', textAlign: 'right' },
```

Si `ProfileScreen` no tiene todavía un `navigation`, añade `const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();` con sus imports, junto a los demás hooks.

- [ ] **Step 2: Verificar**

Run: `cd apapacha-mobile && npx tsc --noEmit && npx jest`
Expected: exit 0.

Run: `cd apapacha-mobile && npx expo start --web` y comprueba que el bundle compila. La comprobación con sesión real (que el correo mostrado sea el correcto y que "Cambiar contraseña" abra la pantalla) queda para la prueba en dispositivo: **no la declares hecha si no tienes credenciales**.

- [ ] **Step 3: Commit**

```bash
git add apapacha-mobile/src/screens/ProfileScreen.tsx
git commit -m "feat(perfil): mostrar el correo de la cuenta y accion de cambiar contrasena"
```

---

## Task 4: Estado real del gato reportado por el cuidador

Sustituye dato inventado por una función real. Es la tarea más grande: hazla en el orden de los steps.

**Files:**
- Create: `supabase/migrations/20260730_pet_reports.sql`
- Create: `apapacha-mobile/src/services/petReports.service.ts`
- Create: `apapacha-mobile/src/components/PetReportSheet.tsx`
- Modify: `apapacha-mobile/src/types/database.ts`
- Modify: `apapacha-mobile/src/screens/HostDashboardScreen.tsx`
- Modify: `apapacha-mobile/src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `MediaSourceSheet` y `pickImage` (ya existen, de la tanda anterior); bucket `chat-media` (ya existe, con RLS por participante de la reserva y purga al terminar).
- Produces:
  - Tipo `PetReport { id, booking_id, author_id, mood, note, photo_url, created_at }` y `PET_MOODS`
  - `createPetReport(bookingId, mood, note?, photoUri?): Promise<void>`
  - `getLatestPetReport(bookingId): Promise<PetReport | null>`
  - `<PetReportSheet visible bookingId onClose onDone />`

- [ ] **Step 1: Migración**

Crear `supabase/migrations/20260730_pet_reports.sql`:

```sql
-- Reportes de estado del gato durante un servicio en curso.
--
-- Antes, HomeScreen mostraba un "Estado actual" FABRICADO
-- (MOOD_STATES[pet.id.charCodeAt(2) % 5]): el dueño veía información inventada
-- sobre su gato y el cuidador no tenía dónde reportarla. Esta tabla lo hace real.

CREATE TABLE IF NOT EXISTS public.pet_reports (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mood       text NOT NULL CHECK (mood IN ('jugueton', 'tranquilo', 'feliz', 'descansando', 'curioso', 'decaido')),
  note       text,
  photo_url  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_reports_booking ON public.pet_reports(booking_id, created_at DESC);

ALTER TABLE public.pet_reports ENABLE ROW LEVEL SECURITY;

-- Escribe solo el cuidador del servicio de esa reserva.
DROP POLICY IF EXISTS "Host writes pet reports" ON public.pet_reports;
CREATE POLICY "Host writes pet reports" ON public.pet_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (
        EXISTS (SELECT 1 FROM public.spaces   s WHERE s.id = b.service_id AND s.host_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
      )
    )
  );

-- Leen ambas partes de la reserva.
DROP POLICY IF EXISTS "Participants read pet reports" ON public.pet_reports;
CREATE POLICY "Participants read pet reports" ON public.pet_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (
        b.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.spaces   s WHERE s.id = b.service_id AND s.host_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
      )
    )
  );

-- Avisar al dueño en cuanto hay reporte nuevo (el INSERT en notifications
-- dispara el Web Push por el trigger trg_push_on_notification).
CREATE OR REPLACE FUNCTION public.notify_owner_on_pet_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.bookings WHERE id = NEW.booking_id;
  IF v_owner IS NULL OR v_owner = NEW.author_id THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_owner,
    'pet_report',
    'Nuevo reporte de tu gato',
    COALESCE(NULLIF(btrim(NEW.note), ''), 'Tu cuidador actualizó el estado de tu gato.'),
    jsonb_build_object('booking_id', NEW.booking_id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[notify_owner_on_pet_report] %', SQLERRM;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_notify_owner_on_pet_report ON public.pet_reports;
CREATE TRIGGER trg_notify_owner_on_pet_report
  AFTER INSERT ON public.pet_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_owner_on_pet_report();
```

Aplicar con `supabase db query --linked -f supabase/migrations/20260730_pet_reports.sql`.

- [ ] **Step 2: Verificar la migración y la RLS**

```bash
supabase db query --linked "
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='pet_reports' ORDER BY ordinal_position;
SELECT polname FROM pg_policy WHERE polrelid='public.pet_reports'::regclass;
SELECT tgname FROM pg_trigger WHERE tgrelid='public.pet_reports'::regclass AND NOT tgisinternal;
"
```

Expected: 7 columnas, dos políticas (`Host writes pet reports`, `Participants read pet reports`), y el trigger `trg_notify_owner_on_pet_report`.

Prueba además, con una reserva real, que el **dueño no puede insertar** un reporte (solo el cuidador). Simula la sesión con `SET LOCAL role authenticated;` + `SET LOCAL request.jwt.claims = '{"sub":"<OWNER_ID>","role":"authenticated"}';` dentro de una transacción con `ROLLBACK`, e intenta el INSERT: debe fallar con `42501`. Reporta la salida literal.

- [ ] **Step 3: Tipos y servicio**

En `apapacha-mobile/src/types/database.ts`, añadir:

```ts
export type PetMood = 'jugueton' | 'tranquilo' | 'feliz' | 'descansando' | 'curioso' | 'decaido';

export interface PetReport {
  id: string;
  booking_id: string;
  author_id: string;
  mood: PetMood;
  note: string | null;
  photo_url: string | null;
  created_at: string;
}
```

Crear `apapacha-mobile/src/services/petReports.service.ts`:

```ts
import { supabase } from '../../supabase';
import type { PetMood, PetReport } from '../types/database';

// Etiquetas e iconos de cada ánimo. El icono es un Ionicon (no emoji) para
// seguir el sistema de diseño; el valor guardado en la DB es la clave.
export const PET_MOODS: { value: PetMood; label: string; icon: string }[] = [
  { value: 'jugueton',    label: 'Juguetón',    icon: 'tennisball-outline' },
  { value: 'tranquilo',   label: 'Tranquilo',   icon: 'leaf-outline' },
  { value: 'feliz',       label: 'Feliz',       icon: 'heart-outline' },
  { value: 'descansando', label: 'Descansando', icon: 'moon-outline' },
  { value: 'curioso',     label: 'Curioso',     icon: 'search-outline' },
  { value: 'decaido',     label: 'Decaído',     icon: 'sad-outline' },
];

export function moodLabel(mood: PetMood): string {
  return PET_MOODS.find(m => m.value === mood)?.label ?? mood;
}

export function moodIcon(mood: PetMood): string {
  return PET_MOODS.find(m => m.value === mood)?.icon ?? 'paw-outline';
}

// Sube la foto del reporte al bucket chat-media (mismas políticas por
// participante de la reserva y misma purga al terminar el servicio).
async function uploadReportPhoto(bookingId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = blob.type?.includes('png') ? 'png' : 'jpg';
  const path = `${bookingId}/reporte-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('chat-media').getPublicUrl(path).data.publicUrl;
}

export async function createPetReport(
  bookingId: string,
  mood: PetMood,
  note?: string,
  photoUri?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const photo_url = photoUri ? await uploadReportPhoto(bookingId, photoUri) : null;

  const { error } = await supabase.from('pet_reports').insert({
    booking_id: bookingId,
    author_id: user.id,
    mood,
    note: note?.trim() ? note.trim() : null,
    photo_url,
  });
  if (error) throw error;
}

export async function getLatestPetReport(bookingId: string): Promise<PetReport | null> {
  const { data, error } = await supabase
    .from('pet_reports')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('[petReports] getLatestPetReport:', error.message); return null; }
  return (data as PetReport) ?? null;
}
```

- [ ] **Step 4: Hoja de reporte para el cuidador**

Crear `apapacha-mobile/src/components/PetReportSheet.tsx`: un `Modal` transparente con la hoja abajo (mismo patrón visual que `MediaSourceSheet.tsx` — léelo y reutiliza su estructura y estilos), que contenga:

- Título "¿Cómo está el gato?"
- Una rejilla de opciones de `PET_MOODS`: cada una un `TouchableOpacity` con su `Ionicons` y su etiqueta; la seleccionada se marca con `colors.primary` y borde.
- Un `TextInput` multilínea opcional, placeholder "Agrega una nota para el dueño (opcional)", máximo 200 caracteres.
- Un botón para adjuntar foto opcional que abre `MediaSourceSheet` (`kind="image"`) y usa `pickImage`; si hay foto, muestra una miniatura con opción de quitarla.
- Botón primario "Enviar reporte" (componente `Button`), deshabilitado si no hay ánimo elegido, con estado de carga; llama a `createPetReport` y, al terminar, `onDone()` y toast de éxito. Ante error, toast de error y la hoja NO se cierra.

Props: `{ visible: boolean; bookingId: string; onClose: () => void; onDone: () => void }`.

- [ ] **Step 5: Botón en el panel del cuidador**

En `apapacha-mobile/src/screens/HostDashboardScreen.tsx`, en la tarjeta de las reservas **en curso** (las que tienen `status === 'active'`), añadir junto a los botones del flujo existente un botón "Reportar estado" que abra `PetReportSheet` con el `bookingId` de esa reserva.

Guarda en estado qué reserva está reportando: `const [reportBookingId, setReportBookingId] = useState<string | null>(null);`, y monta una sola hoja al final del árbol:

```tsx
      {reportBookingId && (
        <PetReportSheet
          visible
          bookingId={reportBookingId}
          onClose={() => setReportBookingId(null)}
          onDone={() => { setReportBookingId(null); reload(); }}
        />
      )}
```

Usa el nombre real de la función de recarga de la pantalla (en este archivo es `reload`; compruébalo).

- [ ] **Step 6: Sustituir el dato falso en Inicio**

En `apapacha-mobile/src/screens/HomeScreen.tsx`:

1. **Borrar** `MOOD_STATES`, `getMoodForPet` y la variable `mood` derivada de ellos. No dejes rastro: es el dato inventado.
2. Cargar el reporte real de la reserva activa. Junto a la carga existente de datos de la pantalla:

```tsx
  const [petReport, setPetReport] = useState<PetReport | null>(null);
```

y dentro del efecto/callback que ya carga `nextBooking`, cuando `isActive` sea true:

```tsx
      getLatestPetReport(nextBooking.id).then(setPetReport).catch(() => {});
```

3. Reemplazar el bloque `{isActive && mood ? (...)}` por el reporte real. **Condición: `enCurso`, no `isActive`** — ver Task 7, que introduce `enCurso = status === 'active' && service_phase === 'in_progress'`. Un reporte de estado solo tiene sentido con el servicio empezado.
   - Si hay `petReport`: la tarjeta muestra el `Ionicons` de `moodIcon(petReport.mood)`, el texto `moodLabel(petReport.mood)`, la nota si existe, la hora relativa del reporte, y la foto en miniatura si hay `photo_url` (tocarla la abre: en web `window.open`).
   - Si `enCurso` y **no** hay reporte: estado vacío honesto — "Tu cuidador aún no ha enviado un reporte." No inventes nada.

**Orden:** haz la Task 7 antes de este step, o al menos introduce `enCurso` aquí y deja que la Task 7 termine de limpiar los demás usos.
4. Quita del `StyleSheet` los estilos que queden sin uso (`moodEmoji` etc.) y añade los nuevos que necesites.

- [ ] **Step 7: Verificar**

Run: `cd apapacha-mobile && npx tsc --noEmit && npx jest`
Expected: exit 0.

Run: `cd apapacha-mobile && npx expo export --platform web`
Expected: sin errores.

Comprueba con grep que el dato falso ya no existe:

```bash
cd apapacha-mobile && grep -rn "MOOD_STATES\|getMoodForPet\|charCodeAt" src/screens/HomeScreen.tsx
```

Expected: sin salida.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260730_pet_reports.sql apapacha-mobile/src/services/petReports.service.ts apapacha-mobile/src/components/PetReportSheet.tsx apapacha-mobile/src/types/database.ts apapacha-mobile/src/screens/HostDashboardScreen.tsx apapacha-mobile/src/screens/HomeScreen.tsx
git commit -m "feat(cuidado): reporte real del estado del gato en vez de dato inventado

HomeScreen mostraba MOOD_STATES[pet.id.charCodeAt(2) % 5]: informacion
fabricada sobre el gato del usuario. Ahora el cuidador lo reporta de verdad."
```

---

## Task 5: Orden de guards del banner de notificaciones

**Files:**
- Create: `apapacha-mobile/src/components/pushBannerState.ts`
- Create: `apapacha-mobile/src/components/pushBannerState.test.ts`
- Modify: `apapacha-mobile/src/components/PushPermissionBanner.tsx`

**Interfaces:**
- Produces: `type PushBannerState = 'oculto' | 'pedir' | 'instalar'` y `decidePushBannerState(env): PushBannerState`.

- [ ] **Step 1: Escribir el test que falla**

Crear `apapacha-mobile/src/components/pushBannerState.test.ts`:

```ts
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd apapacha-mobile && npx jest src/components/pushBannerState.test.ts`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar la función pura**

Crear `apapacha-mobile/src/components/pushBannerState.ts`:

```ts
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
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd apapacha-mobile && npx jest src/components/pushBannerState.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Usar la función en el componente**

En `apapacha-mobile/src/components/PushPermissionBanner.tsx`, sustituir el cuerpo del `useFocusEffect` por:

```tsx
      setEstado(decidePushBannerState({
        supported: isPushSupported(),
        ios: isIOS(),
        standalone: isStandalonePWA(),
        permission: getPushPermission(),
      }));
      // Reconcilia permiso concedido con suscripción en BD (silencioso, nunca rechaza).
      ensurePushSubscription().catch(() => {});
```

Importa `decidePushBannerState` y usa `PushBannerState` como tipo del estado en vez del `type Estado` local (bórralo). Mantén el resto del componente igual.

- [ ] **Step 6: Verificar**

Run: `cd apapacha-mobile && npx tsc --noEmit && npx jest`
Expected: exit 0, 20 tests (14 previos + 6 nuevos).

- [ ] **Step 7: Commit**

```bash
git add apapacha-mobile/src/components/pushBannerState.ts apapacha-mobile/src/components/pushBannerState.test.ts apapacha-mobile/src/components/PushPermissionBanner.tsx
git commit -m "fix(push): el aviso de instalar la PWA ya es alcanzable en Safari de iOS

isPushSupported() exige 'Notification' in window, que iOS solo expone a web
apps instaladas: el guard de soporte tapaba justo el caso que debia explicar."
```

---

## Task 6: Iconos opacos para que iOS muestre el logo

**Files:**
- Modify: `apapacha-mobile/public/icons/apple-touch-icon.png`
- Modify: `apapacha-mobile/public/icons/icon-192.png`
- Modify: `apapacha-mobile/public/icons/icon-512.png`
- Modify: `apapacha-mobile/scripts/pwa-postbuild.js`

**Interfaces:** ninguna.

- [ ] **Step 1: Confirmar el diagnóstico**

```bash
cd apapacha-mobile
python3 -c "
from PIL import Image
for f in ['public/icons/apple-touch-icon.png','public/icons/icon-192.png','public/icons/icon-512.png']:
    im = Image.open(f).convert('RGBA')
    print(f, im.size, 'alpha min/max:', im.getchannel('A').getextrema(), 'esquina:', im.load()[0,0])
"
```

Expected: los tres con `alpha min/max: (0, 255)` y esquina `(0, 0, 0, 0)` — transparencia real. El arte es un logo morado sobre fondo blanco con esquinas redondeadas transparentes.

- [ ] **Step 2: Aplanar sobre blanco opaco**

iOS aplica su propia máscara redondeada al `apple-touch-icon` y compone cualquier transparencia sobre **negro**, de ahí el icono roto. El arreglo es entregar cuadrados opacos.

```bash
cd apapacha-mobile
python3 -c "
from PIL import Image
# El arte ya tiene fondo blanco en el centro; rellenamos las esquinas
# transparentes con el mismo blanco para entregar un cuadrado opaco.
for f in ['public/icons/apple-touch-icon.png','public/icons/icon-192.png','public/icons/icon-512.png']:
    im = Image.open(f).convert('RGBA')
    fondo = Image.new('RGB', im.size, (255, 255, 255))
    fondo.paste(im, mask=im.getchannel('A'))
    fondo.save(f, 'PNG')
    print('aplanado:', f)
"
```

- [ ] **Step 3: Verificar que ya no hay canal alfa**

```bash
cd apapacha-mobile && file public/icons/*.png
```

Expected: los tres como `8-bit/color RGB` (sin la `A` de RGBA), con sus tamaños intactos (180x180, 192x192, 512x512).

Comprueba también que el logo sigue visible abriendo `public/icons/apple-touch-icon.png` (o con `python3 -c "from PIL import Image; Image.open('public/icons/apple-touch-icon.png').show()"` si el entorno lo permite). Si el logo quedó invisible o con un halo raro, **para y reporta**: el color de fondo elegido sería incorrecto.

- [ ] **Step 4: Declarar el tamaño en el tag y quitar `maskable` del icono sin margen**

En `apapacha-mobile/scripts/pwa-postbuild.js`, en el bloque `head` que se inyecta, cambiar la línea del apple-touch-icon por:

```js
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
```

En `apapacha-mobile/public/manifest.json`, quitar la tercera entrada de `icons` (la de `purpose: "maskable"`): apunta al mismo PNG sin margen de seguridad, así que en Android la máscara recorta el logo. Deja solo las dos entradas `purpose: "any"`. Añade un comentario en el reporte indicando que un icono maskable propio (con ~20% de margen) es una mejora pendiente de diseño, no de código.

- [ ] **Step 5: Build y verificación en el bundle**

```bash
cd apapacha-mobile
npx expo export --platform web && node scripts/pwa-postbuild.js
file dist/icons/apple-touch-icon.png
grep -c 'sizes="180x180"' dist/index.html
python3 -c "
import json
m = json.load(open('dist/manifest.json'))
print('iconos en el manifest:', len(m['icons']))
print('con maskable:', [i for i in m['icons'] if i.get('purpose') == 'maskable'])
"
```

Expected: el icono en `dist/` es RGB (sin alfa), el `grep -c` da 1, el manifest tiene 2 iconos y ninguno `maskable`.

- [ ] **Step 6: Commit**

```bash
git add apapacha-mobile/public/icons apapacha-mobile/scripts/pwa-postbuild.js apapacha-mobile/public/manifest.json
git commit -m "fix(pwa): iconos opacos para que iOS muestre el logo al instalar

Los tres PNG tenian esquinas transparentes y iOS compone la transparencia del
apple-touch-icon sobre negro, dejando el icono roto."
```

---

## Task 7: Inicio dejó de decir "en curso" antes de que el cuidador empiece

**Files:**
- Modify: `apapacha-mobile/src/screens/HomeScreen.tsx`

**Interfaces:** ninguna nueva. Introduce las variables locales `confirmada` y `enCurso`.

**El problema:** `status='active'` significa *confirmada y pagada*; el servicio empieza cuando el cuidador pulsa "Iniciar", que es lo que pone `service_phase='in_progress'`. Inicio usaba `status==='active'` para rotular "Servicio en curso" y para la alerta "Tu cuidador está con tus gatos", así que el cliente veía su reserva como en curso cuando el cuidador ni había empezado. `BookingsScreen.tsx:275` ya hace la distinción correcta: úsala como referencia de vocabulario.

- [ ] **Step 1: Separar los dos conceptos**

En `apapacha-mobile/src/screens/HomeScreen.tsx`, sustituir la línea 92 (`const isActive = nextBooking?.status === 'active';`) por:

```tsx
  // OJO: status 'active' significa "confirmada y pagada", NO "en curso". El
  // servicio empieza cuando el cuidador pulsa Iniciar, que es lo que pone
  // service_phase='in_progress' (host.service.completeBooking/startService).
  // Confundir ambos hacía que al cliente le apareciera "Tu cuidador está con
  // tus gatos" antes de que el cuidador hubiera empezado.
  const confirmada = nextBooking?.status === 'active';
  const enCurso = confirmada && nextBooking?.service_phase === 'in_progress';
```

- [ ] **Step 2: Corregir cada uso**

Recorre **todos** los usos de `isActive` en el archivo y decide cuál corresponde:

- Alerta inteligente (línea ~97): con `enCurso`, el mensaje actual "Servicio en curso… Tu cuidador está con tus gatos." Con `confirmada && !enCurso`, un mensaje nuevo y verdadero: `'Reserva confirmada. Tu cuidador aún no ha iniciado el servicio.'` (tipo `'info'`, ícono `Ionicons` acorde al patrón del archivo). Usa claves distintas (`'active'` y `'confirmed'`) para que el descarte de alertas siga funcionando.
- Estilo de la tarjeta (`styles.visitCardActive`, línea ~203): mantener con `enCurso` (es el realce visual de "está pasando ahora").
- Rótulo de la tarjeta (línea ~204): `enCurso ? 'Servicio en curso' : 'Próxima reserva'`.
- Punto de estado y texto (líneas ~212-213): tres estados en vez de dos —
  `enCurso` → `'En curso'`;
  `confirmada` → `'Confirmada · por iniciar'`;
  ninguno → `'Pendiente confirmación'`.
  Usa el `statusDot` activo solo con `enCurso`.
- Tarjeta de reporte del gato (Task 4): `enCurso`.

Quita el emoji `🟢` del texto de estado: el archivo ya tiene `statusDot` para eso y el sistema de diseño no usa emojis en la UI.

- [ ] **Step 3: Verificar que no quedó ningún uso ambiguo**

```bash
cd apapacha-mobile && grep -n "isActive" src/screens/HomeScreen.tsx
```

Expected: sin salida (todos los usos migrados a `confirmada` o `enCurso`).

Run: `npx tsc --noEmit && npx jest`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apapacha-mobile/src/screens/HomeScreen.tsx
git commit -m "fix(inicio): no decir 'servicio en curso' antes de que el cuidador inicie

status 'active' es confirmada y pagada; el inicio real es service_phase
'in_progress'. Inicio mostraba 'Tu cuidador esta con tus gatos' sin que el
cuidador hubiera empezado."
```

---

## Cierre (lo hace el controlador, no un implementador)

1. Revisión final de toda la tanda.
2. `npx vercel deploy --prod` desde `apapacha-mobile/`.
3. Entregar al dueño el checklist de verificación en iPhone: **reinstalar** la PWA (borrar el icono viejo y volver a agregarla a inicio, para que iOS tome el icono nuevo), probar el enlace de restablecer contraseña, ver el correo en Cuenta, ver el banner de notificaciones en Safari, y pedirle a un cuidador que envíe un reporte de estado.
