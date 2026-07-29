# Diseño — Push, cámara/video y arreglo de la instancia PWA

**Fecha:** 2026-07-29
**Estado:** aprobado
**Ámbito:** `apapacha-mobile/` (Expo web → PWA en Vercel) + `supabase/` (migraciones y edge functions)

## Contexto

ApapachaPet se distribuye como PWA instalable (Expo Web export + Vercel). Usuarios y el
dueño del producto reportaron cuatro problemas:

1. La app instalada no emite notificaciones push del sistema.
2. Al adjuntar una foto solo se puede elegir de la galería; falta cámara directa, y no
   hay soporte de video (grabar o subir).
3. Los chats no avisan cuando la contraparte responde.
4. En un iPhone con la PWA instalada no se puede cerrar sesión ni registrarse.

## Causa raíz del problema 4 (verificada en código)

`linking` está activo en el `NavigationContainer` (`App.tsx:222`) y el stack sin sesión
(`App.tsx:150-157`) registra **`Login` y `MainTabs` en el mismo navegador**. El mapa de
rutas (`src/linking.ts:18`) asocia la URL `/` a `MainTabs > Home`.

Consecuencias:

- **No se puede registrar:** la PWA instalada arranca en `start_url: "/"`. React Navigation
  resuelve esa URL contra el navegador actual y monta `MainTabs`, nunca `Login`. No existe
  ningún `navigation.navigate('Login')` en toda la app (verificado por grep), y en modo
  `standalone` no hay barra de direcciones para escribir `/login` → callejón sin salida.
- **No se puede cerrar sesión:** `ProfileScreen.tsx:344` llama a `signOut`, la sesión sí se
  borra, pero la URL sigue siendo `/perfil`; el stack de invitado vuelve a montar
  `MainTabs > Profile` y la pantalla se ve idéntica → parece que el botón no hace nada.

En navegador de escritorio el bug existe igual, pero se disimula porque el usuario puede
escribir `/login` a mano.

## Arquitectura

Cuatro unidades independientes. Cada una se puede construir, probar y desplegar por
separado; la única dependencia es que **3 (chat) requiere 2 (push)** ya en su lugar.

```
┌────────────────────┐   ┌──────────────────────────────────────────────┐
│ 1. Auth PWA        │   │ 2. Web Push                                  │
│ App.tsx / linking  │   │ push_subscriptions ─ push.service ─ sw.js    │
│ AuthContext.signOut│   │        │                                     │
│ CTAs de invitado   │   │        └─ trigger notifications ─ send-push  │
└────────────────────┘   └──────────────────────────────────────────────┘
┌────────────────────┐   ┌──────────────────────────────────────────────┐
│ 3. Chat notifica   │   │ 4. Cámara y video                            │
│ trigger messages → │   │ lib/mediaPicker + MediaSourceSheet           │
│ notifications      │   │ messages.video_url + expo-video              │
└────────────────────┘   └──────────────────────────────────────────────┘
```

---

## 1. Arreglo de la instancia PWA (auth)

### Componentes

**`src/linking.ts`** — exporta dos configuraciones en vez de una:

- `linking` (autenticado): la actual, sin cambios.
- `guestLinking`: solo mapea rutas públicas — `Login: 'login'`, `MainTabs > Explore:
  'explorar'`, `SpaceDetail: 'alojamiento/:id'`, `VisiterDetail: 'visita/:id'`. Cualquier
  otra ruta cae fuera del mapa y React Navigation usa `initialRouteName`, que será `Login`.

**`App.tsx`** — el `NavigationContainer` recibe `session ? linking : guestLinking`, y el
stack sin sesión declara `initialRouteName="Login"`.

**`src/context/AuthContext.tsx`** — `signOut` deja de ser un no-op silencioso:

```
async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // fallback: limpiar el storage local para no dejar al usuario atrapado
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  } finally {
    setSession(null);
    setProfile(null);
    if (Platform.OS === 'web') window.history.replaceState(null, '', '/');
  }
}
```

El `replaceState` es lo que impide que el linking restaure `/perfil` tras el logout.

**CTAs de invitado** — en `ProfileScreen`, `InboxScreen` y `BookingsScreen`, cuando
`!session`, se renderiza un estado vacío con botón "Iniciar sesión / Crear cuenta" que hace
`navigation.navigate('Login')`. Es el primer punto de entrada explícito a `Login` en la app.

**Salida hacia el modo invitado** — con `Login` como ruta inicial hace falta una puerta de
entrada explícita a la navegación sin cuenta (hoy solo se llegaba por accidente vía
linking). `LoginScreen` gana un enlace discreto bajo el formulario, **"Explorar sin cuenta"**,
que hace `navigation.navigate('MainTabs')`. Así el flujo de invitado queda intencional y
reversible: Login ⇄ MainTabs.

**`scripts/pwa-postbuild.js`** — reemplazar el `<meta name="viewport">` generado por Expo
por uno con `viewport-fit=cover`, y añadir al reset CSS `padding` con
`env(safe-area-inset-*)` sobre `#root` para que en standalone el contenido no quede bajo
la barra de estado ni el indicador de inicio.

### Manejo de errores

Si `supabase.auth.signOut()` falla (red caída, lock de Safari), el bloque `finally` limpia
el estado local igual: el usuario nunca queda atrapado en sesión. Se muestra un toast
informativo, no un bloqueo.

### Verificación

- Con sesión, ir a `/perfil` → "Cerrar Sesión" → debe quedar en `Login` y la URL en `/`.
- Sin sesión, abrir `/` → debe mostrar `Login` (no Home).
- Sin sesión, abrir `/explorar` → debe mostrar Explorar (navegación de invitado intacta).
- Sin sesión, abrir `/perfil` → debe mostrar `Login`.
- En iPhone con la PWA instalada: registrar cuenta nueva y cerrar sesión de punta a punta.

---

## 2. Notificaciones push (Web Push)

### Datos

Migración `20260729_push_subscriptions.sql`:

```sql
CREATE TABLE public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
```

RLS: el dueño puede `SELECT`/`INSERT`/`UPDATE`/`DELETE` sus propias filas (`user_id =
auth.uid()`). Nadie más lee la tabla desde la API pública; la edge function usa
`service_role`.

### Service worker (`public/sw.js`)

Se bumpea `CACHE` a `apapacha-v2` (invalida el shell viejo) y se añaden dos handlers:

- `push`: parsea el JSON del payload y **siempre** llama a `showNotification` (si no, el
  navegador puede revocar el permiso). Usa `icon: /icons/icon-192.png`,
  `badge`, `tag` (para agrupar por conversación), `data.url` para el deep-link. No se
  especifica `sound`: el sistema operativo usa el sonido de notificación por defecto del
  dispositivo, que es exactamente lo pedido.
- `notificationclick`: cierra la notificación, busca un cliente abierto de la app y le hace
  `focus()` + `navigate(url)`; si no hay ninguno, `clients.openWindow(url)`.

### Cliente (`src/services/push.service.ts`)

- `isPushSupported()` — `'serviceWorker' in navigator && 'PushManager' in window`.
- `isStandalone()` — `window.matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone`. En iOS el push **solo** funciona con la PWA instalada (iOS 16.4+).
- `subscribeToPush()` — se llama **desde un gesto del usuario** (requisito de iOS):
  `Notification.requestPermission()` → `registration.pushManager.subscribe({
  userVisibleOnly: true, applicationServerKey })` → upsert en `push_subscriptions` por
  `endpoint`.
- `unsubscribeFromPush()` — borra la fila y desuscribe.

La clave pública VAPID viaja en `EXPO_PUBLIC_VAPID_PUBLIC_KEY` (es pública por diseño).

**UI:** componente `PushPermissionBanner` en Perfil, que aparece solo si el push es
soportado y el permiso está en `default`. Si el navegador es iOS Safari y la app **no** está
instalada, el banner explica cómo agregarla a la pantalla de inicio en vez de pedir permiso.

### Edge Function `send-push`

Mismo patrón de autorización que `send-email`: acepta o bien `x-trigger-secret` (llamadas
desde triggers vía pg_net) o bien un `Authorization: Bearer` de admin.

```ts
import webpush from 'npm:web-push@3.6.7';
webpush.setVapidDetails('mailto:apapachapet.app@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);
```

Cuerpo: `{ user_id, title, body, url, tag }`. Busca todas las suscripciones del usuario
(cliente `service_role`), envía en paralelo, y ante `410 Gone` o `404` **borra** la
suscripción muerta. Nunca devuelve error al llamador por un envío fallido individual.

Secrets nuevos: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (el `TRIGGER_SECRET` ya existe).

### Puente DB → push

Migración `20260729_push_trigger.sql`, calcada de `private.call_send_email`:

```sql
CREATE FUNCTION private.call_send_push(payload jsonb) ... -- pg_net POST a /send-push
CREATE FUNCTION public.notify_push_on_notification() RETURNS trigger ...
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_notification();
```

**Decisión clave:** el trigger cuelga de `notifications`, no de cada evento de negocio. Así
*toda* notificación in-app existente (reserva aceptada/rechazada, pago confirmado,
postulación, avisos a admins) se convierte en push sin tocar ningún otro trigger, y las
futuras lo heredan gratis.

La URL de destino se deriva de `type` + `data` con un `CASE` en SQL que replica
`src/lib/notificationRoute.ts` traducido a los paths de `src/linking.ts`:

| `type`                                                                                          | URL          |
| ----------------------------------------------------------------------------------------------- | ------------ |
| `new_message`                                                                                   | `/chat/<booking_id>` |
| `booking_created`                                                                               | `/panel`     |
| `application_submitted`, `user_registered`, `service_published`, `receipt_submitted`             | `/admin`     |
| `application_approved`, `application_rejected`                                                   | `/perfil`    |
| `booking_accepted`, `booking_rejected`, `booking_confirmed`, `service_started`, `service_completed`, `booking_cancelled` | `/reservas` |
| resto con `data.booking_id`                                                                      | `/reservas`  |
| resto                                                                                            | `/`          |

Igual que `call_send_email`, la función traga cualquier excepción (`RAISE WARNING`) para no
abortar nunca la transacción de negocio.

### Verificación

- Suscribirse desde el navegador, confirmar fila en `push_subscriptions`.
- Insertar una notificación a mano (SQL) → debe llegar la push con sonido del sistema.
- Tocar la notificación → abre la app en la pantalla correcta.
- Endpoint inválido → la fila se borra sola en el siguiente envío.

---

## 3. Notificaciones de chat

Migración `20260729_message_notifications.sql`.

`notify_on_new_message()` (`SECURITY DEFINER`, `AFTER INSERT ON messages`):

1. Carga la reserva y determina el **destinatario**: si `NEW.sender_id = b.owner_id`, el
   destinatario es el host del servicio (`spaces.host_id` o `visiters.host_id` según
   `b.service_type`); en caso contrario, es `b.owner_id`.
2. **Agrupación anti-spam:** si ya existe una notificación `type='new_message'` no leída
   para ese destinatario con el mismo `data->>'booking_id'` **creada hace menos de 5
   minutos**, se **actualiza** esa fila (`body`, `created_at`) en vez de insertar una nueva.
   El push se dispara solo en el INSERT, así que una ráfaga de mensajes no genera una
   ráfaga de pushes, pero un mensaje horas después sí vuelve a avisar.
3. `title` = nombre del servicio; `body` = el texto del mensaje truncado a 80 caracteres, o
   "📷 Foto" / "🎥 Video" si es adjunto; `data = {"booking_id": ...}`.

**Badge en la pestaña Mensajes:** `getUnreadMessageCount()` en `notifications.service.ts`
cuenta notificaciones `type='new_message'` no leídas; `MainTabs` lo pinta como
`tabBarBadge` en Inbox y se suscribe por Realtime (la tabla `notifications` ya está en la
publicación `supabase_realtime`). Al abrir un chat, `ChatDetailScreen` marca como leídas las
de ese `booking_id`.

### Verificación

- Usuario A escribe → B recibe push + badge. B abre el chat → badge desaparece.
- A escribe 5 mensajes seguidos → B tiene 1 notificación, no 5.
- Nadie recibe notificación de sus propios mensajes.

---

## 4. Cámara y video

### Selector compartido

`src/lib/mediaPicker.ts`:

```ts
type MediaSource = 'camera' | 'library';
pickImage(source: MediaSource, opts?): Promise<string | null>   // devuelve uri
pickVideo(source: MediaSource, opts?): Promise<VideoAsset | null>
```

Encapsula los permisos (`requestCameraPermissionsAsync` /
`requestMediaLibraryPermissionsAsync`, no-op en web) y `launchCameraAsync` /
`launchImageLibraryAsync`. En web `launchCameraAsync` ya funciona: expo-image-picker crea un
`<input type="file" accept="image/*" capture>`, que en iOS y Android abre la cámara directa
(verificado en `node_modules/expo-image-picker/build/ExponentImagePicker.web.js`).

`src/components/MediaSourceSheet.tsx`: hoja de acción con "Tomar foto" / "Elegir de la
galería" (y "Grabar video" / "Subir video" cuando el consumidor habilita video). Reemplaza
la llamada directa a la galería en:

- `ChatDetailScreen` (foto + video)
- `EditProfileScreen` (avatar)
- `AddPetScreen` (unifica los dos botones sueltos que ya tiene)
- `ManageServiceScreen` (fotos de servicio, dos puntos de subida)
- `TransferInstructionsScreen` (comprobante de pago)

`ClientVerificationScreen` y `HostOnboardingScreen` ya ofrecen cámara y galería, así que
quedan como están: migrarlas al componente compartido sería churn sobre pantallas que
funcionan, sin beneficio para el usuario.

### Video en el chat

- Migración `20260729_chat_video.sql`: `ALTER TABLE messages ADD COLUMN video_url text`;
  se extiende `purge_chat_media_on_end()` para anular también `video_url`; se fija
  `file_size_limit` del bucket `chat-media` en 25 MB y se añaden los MIME de video a
  `allowed_mime_types`. Las políticas RLS del bucket ya son por participante y cubren video
  sin cambios.
- `messages.service.ts`: `uploadChatVideo(bookingId, uri)` (mismo patrón que
  `uploadChatImage`, carpeta por `booking_id`), y `sendMessage` acepta `videoUrl`.
- **Límites:** 60 segundos y 25 MB, validados en el cliente antes de subir
  (`videoMaxDuration` en el picker + tamaño del blob). Si se excede, toast explicativo; no
  se intenta transcodificar.
- **Reproducción:** dependencia nueva `expo-video` (`VideoView` + `useVideoPlayer`), que
  soporta web y nativo. Burbuja de video con póster y controles nativos; si el player falla,
  fallback a abrir la URL en pestaña nueva.
- `InboxScreen` muestra "🎥 Video" en el preview de último mensaje (hoy ya hace lo
  equivalente con "📷 Foto").

### Verificación

- Desde iPhone: tomar foto en el chat y que llegue; grabar video corto y reproducirlo.
- Video de más de 60s o 25 MB → mensaje de error claro, sin subida a medias.
- Al completar la reserva, fotos y videos se desvinculan y los archivos se purgan.

---

## Pasos manuales requeridos (una sola vez)

1. Generar el par VAPID: `npx web-push generate-vapid-keys`.
2. Cargar los secrets en Supabase (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) y desplegar
   `send-push`.
3. Poner `EXPO_PUBLIC_VAPID_PUBLIC_KEY` en las env vars de Vercel.
4. Aplicar las migraciones con `supabase db query --linked -f <archivo.sql>` (no `db push`:
   la DB remota tiene deriva de migraciones documentada).
5. Verificar el push en un iPhone real con la PWA **instalada en pantalla de inicio**.

## Fuera de alcance

- Notificaciones push nativas (`expo-notifications`) — hoy no se distribuyen builds nativos.
- Sonidos de notificación personalizados: Web Push no lo permite; se usa el del sistema, que
  es lo solicitado.
- Transcodificación o compresión de video en el cliente.
- Indicadores de "escribiendo…" o acuses de lectura en el chat.
