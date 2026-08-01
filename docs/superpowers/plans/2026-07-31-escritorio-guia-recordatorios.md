# Escritorio, guía de uso, iconos y recordatorios — Plan

**Goal:** Dar a la web una identidad de escritorio (menú lateral en vez de barra inferior), añadir una guía de uso guiada al primer ingreso, redondear los iconos de la PWA, y hacer que la app recuerde por push las reservas estancadas.

**Architecture:** Cuatro frentes independientes. Dos de frontend (layout responsive y guía), uno de assets (iconos), uno de base de datos (reglas de reservas + recordatorios, colgando del cron horario que ya existe).

## Global Constraints

- App en `apapacha-mobile/`; comandos de `supabase` desde la raíz del repo.
- Nunca `supabase db push`. Aplicar con `supabase db query --linked -f <archivo>`.
- `npx tsc --noEmit` y `npx jest` en 0 desde `apapacha-mobile/`.
- UI, comentarios y commits en **español**. Íconos `Ionicons`, sin emojis en UI nueva. Tokens desde `src/theme/`.
- El diseño **móvil no cambia**: lo de escritorio es aditivo y se activa por ancho de ventana.
- Ya existe: `pg_cron` con el job `autocompletar-reservas` (`17 * * * *`) llamando a `public.autocomplete_stale_bookings()`. Todo INSERT en `notifications` dispara Web Push.

## Decisiones del dueño

- **Guía:** híbrida — tarjetas animadas sobre fondo difuminado + foco real en 3-4 elementos clave.
- **Reservas estancadas:** las dos reglas — aviso de pago pendiente a los 3 días hábiles de crearse, y cierre del servicio vencido sin resolver.

## Diagnóstico previo

- `push_subscriptions` tiene **0 filas**: por eso no ha llegado ningún push. La cadena funciona (pg_net responde 200), pero no hay dispositivos registrados. No es un bug que arreglar: hay que activar las notificaciones desde la PWA instalada.
- La reserva del 11–13 de julio (`d6ff1ac1`) tiene `host_response='accepted'` y `payment_status='unpaid'`: el cuidador aceptó y el cliente nunca pagó. Es el caso que las reglas nuevas deben resolver.

---

## Task A: Menú lateral en escritorio

React Navigation 7 soporta `tabBarPosition: 'left'` y `tabBarVariant: 'material'` en `bottom-tabs` (verificado en `node_modules/@react-navigation/bottom-tabs/lib/typescript/src/types.d.ts:10,181`). Se aprovecha eso en vez de construir un navegador nuevo.

**Files:** `apapacha-mobile/App.tsx`, `apapacha-mobile/src/hooks/useIsDesktop.ts` (nuevo)

- [ ] **Step 1:** Crear `src/hooks/useIsDesktop.ts`:

```ts
import { Platform, useWindowDimensions } from 'react-native';

// Escritorio = web con ventana ancha. En móvil (nativo o navegador estrecho)
// se mantiene la barra inferior, que es el patrón correcto ahí.
export const DESKTOP_MIN_WIDTH = 900;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}
```

- [ ] **Step 2:** En `MainTabs` (`App.tsx`), usar el hook y alternar la posición y el estilo de la barra: en escritorio `tabBarPosition: 'left'`, `tabBarVariant: 'material'`, ancho fijo ~240, etiquetas visibles junto al ícono, sin el realce circular de "Explorar" (ese realce es un patrón de barra inferior móvil); en móvil, exactamente lo de hoy.

- [ ] **Step 3:** Verificar con `npx expo start --web` a 1400px (menú a la izquierda, contenido a la derecha, sin barra inferior) y a 500px (barra inferior como siempre). Redimensionar en caliente debe alternar sin recargar.

- [ ] **Step 4:** Commit.

---

## Task B: Guía de uso al primer ingreso

**Files:** `src/components/AppTour.tsx` (nuevo), `src/components/tourSteps.ts` (nuevo), `App.tsx`, `src/screens/ProfileScreen.tsx`

- [ ] **Step 1:** `tourSteps.ts` — los pasos como datos: `{ key, title, body, icon, target? }`. `target` es la clave del elemento a enfocar (`'tab-explore' | 'tab-inbox' | 'tab-bookings' | 'profile-menu'`), opcional.

- [ ] **Step 2:** `AppTour.tsx` — overlay a pantalla completa:
  - Fondo difuminado: en web `backdropFilter: 'blur(6px)'` sobre un velo oscuro; en nativo, velo sólido (no hay blur sin dependencia extra).
  - Tarjeta animada con `Animated` (fade + translateY, respetando `useReducedMotion()` que ya existe en `src/hooks/useMotion.ts`).
  - Si el paso tiene `target` y hay medida registrada, dibuja el foco: un recorte resaltado sobre ese rectángulo (borde y sombra) más una flecha hacia la tarjeta.
  - Controles: "Siguiente", "Atrás", "Saltar", indicador de progreso.
  - Persistencia: `AsyncStorage` con clave `tour_visto:<user_id>`; se marca al terminar o al saltar.

- [ ] **Step 3:** Registro de objetivos: un contexto ligero `TourTargets` con `register(key, ref)`; `MainTabs` registra los botones de pestaña que se quieren enfocar. Si un objetivo no está registrado, el paso se muestra sin foco (degradación, nunca error).

- [ ] **Step 4:** Montar el tour dentro de `MainTabs` y dispararlo cuando hay sesión y no está marcado como visto. Añadir en Perfil → Cuenta una fila "Ver guía de uso" que lo relance.

- [ ] **Step 5:** `tsc`, `jest`, y prueba manual en web ancho y estrecho.

- [ ] **Step 6:** Commit.

---

## Task C: Iconos con esquinas redondeadas

El problema no es el mismo en cada plataforma, así que no sirve un solo archivo:

- **iOS** aplica su propia máscara al `apple-touch-icon` y compone la transparencia sobre negro → ese archivo debe seguir siendo un **cuadrado opaco** (como quedó ayer). Redondearlo ahí sería contraproducente.
- **Escritorio y Chrome** usan los iconos del manifest tal cual, sin máscara → ahí es donde se ve cuadrado, y es donde hay que hornear las esquinas redondeadas con transparencia.
- **Android** aplica máscara solo a los iconos `purpose: "maskable"`, que además necesitan ~20% de margen de seguridad.

**Files:** `public/icons/*` (nuevos), `public/manifest.json`, `scripts/pwa-postbuild.js`

- [ ] **Step 1:** Generar con Pillow, desde el arte opaco actual:
  - `icon-192-rounded.png`, `icon-512-rounded.png`: esquinas redondeadas (radio ≈22% del lado, el squircle de iOS) con transparencia.
  - `icon-maskable-512.png`: opaco, con el logo reducido al 60% centrado (margen de seguridad para la máscara de Android).
  - `apple-touch-icon.png`: **sin cambios**, sigue opaco y cuadrado.
- [ ] **Step 2:** `manifest.json`: los `any` apuntan a los redondeados; añadir la entrada `maskable` al nuevo archivo con margen.
- [ ] **Step 3:** Verificar con `file` y `python3` que los redondeados tienen alfa en las esquinas y el maskable no; comprobar el manifest servido tras el build.
- [ ] **Step 4:** Commit.

---

## Task D: Reservas estancadas y recordatorios por push

Todo cuelga de `public.autocomplete_stale_bookings()`, que ya corre cada hora.

**Files:** `supabase/migrations/20260731_stale_bookings_reminders.sql`

- [ ] **Step 1:** Helper de días hábiles:

```sql
CREATE OR REPLACE FUNCTION public.business_days_between(desde timestamptz, hasta timestamptz)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT count(*)::int FROM generate_series(desde::date, hasta::date - 1, interval '1 day') d
   WHERE extract(isodow FROM d) < 6;
$$;
```

- [ ] **Step 2:** Regla 1 — **pago pendiente**. Reserva `status='pending'`, `host_response='accepted'`, `payment_status='unpaid'`, creada hace ≥3 días hábiles: notificar al cliente ("Tu reserva espera el pago") y al cuidador, una sola vez (`type='booking_payment_reminder'`, sin duplicar por `booking_id`).

- [ ] **Step 3:** Regla 2 — **servicio vencido sin resolver**. Reserva `status='pending'` cuyo `end_date` pasó hace ≥3 días hábiles: notificar a ambas partes preguntando si el servicio se realizó (`type='booking_unresolved'`), una sola vez.

- [ ] **Step 4:** Regla 3 — **cancelación automática**. Si sigue `pending` 2 días después del aviso de la regla 2, pasa a `status='cancelled'`, `cancelled_by='admin'`, `cancellation_reason='Sin confirmación tras el servicio'`, y se notifica a ambas partes. No se borra la fila: queda como cancelada, que es lo pedido y conserva el historial.

- [ ] **Step 5:** Regla 4 — **recordatorio de reserva próxima**. Reserva `status='active'` que empieza mañana: recordatorio al cliente y al cuidador, una sola vez (`type='booking_tomorrow'`). Es el "recuérdame cosas" pedido.

- [ ] **Step 6:** Añadir las URLs de los tipos nuevos a `public.notification_url` para que el push abra la pantalla correcta.

- [ ] **Step 7:** Verificar: ensayo con `BEGIN; … ROLLBACK;` mostrando qué haría con los datos reales, y comprobación explícita de que la reserva `d6ff1ac1` queda cancelada. Ejecutar de verdad después. Limpiar cualquier dato de prueba.

- [ ] **Step 8:** Commit.

---

## Cierre

Revisión, build, deploy y checklist de verificación en iPhone (incluida la activación de notificaciones, que es lo que falta para que lleguen los push).
