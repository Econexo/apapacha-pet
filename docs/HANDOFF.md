# ApapachaPet — Handoff Completo
> Última actualización: 2026-05-01

---

## Descripción del Proyecto

**ApapachaPet** es un marketplace de hospitalidad felina premium para Chile. Conecta dueños de gatos con cuidadores (hosts) que ofrecen dos tipos de servicio:
- **Alojamiento (Space)**: el gato se queda en casa del cuidador
- **Visita domiciliaria (Visiter)**: el cuidador va a la casa del dueño

Stack técnico: **Expo / React Native** (web + móvil) + **Supabase** (auth, DB, storage, edge functions) + **Vercel** (deployment).

---

## URLs y Accesos Clave

| Recurso | URL / ID |
|---|---|
| App desplegada (producción) | `https://apapacha-mobile.vercel.app` |
| Vercel proyecto correcto | `apapacha-mobile` (dentro de `apapacha-mobile/`) |
| Vercel proyecto incorrecto (NO usar) | `apapacha-pet` (raíz del repo, no sirve) |
| Supabase Project ID | `mzqvkzjxubuqpdnznigy` |
| Supabase Dashboard | https://supabase.com |
| Email admin | `apapachapet.app@gmail.com` |

> ⚠️ **Siempre hacer deploy desde `apapacha-mobile/`**:
> ```bash
> cd apapacha-mobile && npx vercel --prod --yes
> ```

---

## Estructura del Repositorio

```
/
├── apapacha-mobile/          ← App Expo (TODO el código relevante está aquí)
│   ├── App.tsx               ← Navegación raíz (Stack + Tabs)
│   ├── assets/
│   │   ├── LogoSplash.png    ← Logo circular para LoginScreen (1485×1485)
│   │   ├── LogoHeader.png    ← Logo horizontal para AppHeader (1485×1485, usa cover)
│   │   ├── favicon.png       ← LogoApp.png (ícono cuadrado)
│   │   └── icon.png
│   ├── src/
│   │   ├── components/
│   │   │   └── AppHeader.tsx ← Header universal con logo (cover mode)
│   │   ├── context/
│   │   │   └── AuthContext.tsx ← Session + Profile con retry
│   │   ├── screens/          ← Todas las pantallas (ver lista abajo)
│   │   ├── services/         ← Servicios Supabase
│   │   ├── theme/
│   │   │   └── colors.ts
│   │   └── types/
│   │       ├── database.ts   ← Tipos TypeScript del schema
│   │       └── navigation.ts ← RootStackParamList completo
│   └── supabase.ts           ← Cliente Supabase
├── supabase/
│   ├── migrations/           ← SQL migrations (ver sección DB)
│   └── functions/            ← Edge functions (send-approval-email)
└── docs/
    └── HANDOFF.md            ← Este archivo
```

---

## Pantallas (Screens)

| Pantalla | Ruta | Descripción |
|---|---|---|
| `LoginScreen` | `Login` | Email/password login + signup + demo mode |
| `OnboardingScreen` | `Onboarding` | Nombre, apellido, edad, dirección del usuario nuevo |
| `SetPasswordScreen` | `SetPassword` | Para usuarios que llegan por magic link |
| `ClientVerificationScreen` | `ClientVerification` | Subida de doc de identidad (KYC) |
| `HomeScreen` | `MainTabs > Home` | Dashboard del dueño: gato, próxima reserva, acciones rápidas |
| `ExploreScreen` | `MainTabs > Explore` | Tabs Espacios / Visiters con filtros |
| `InboxScreen` | `MainTabs > Inbox` | Lista de chats por booking |
| `BookingsScreen` | `MainTabs > Bookings` | Historial de reservas + cancelar + repetir + reseñar |
| `ProfileScreen` | `MainTabs > Profile` | Perfil, mascotas, modo negocio, contrato |
| `SpaceDetailScreen` | `SpaceDetail` | Detalle de espacio con datos reales de Supabase |
| `VisiterDetailScreen` | `VisiterDetail` | Detalle de visiter con datos reales de Supabase |
| `CheckoutScreen` | `Checkout` | Selección de fechas y mascota para reservar |
| `TransferInstructionsScreen` | `TransferInstructions` | Instrucciones de pago por transferencia + subida comprobante |
| `PaymentSuccessScreen` | `PaymentSuccess` | Confirmación post-reserva |
| `CheckInScreen` | `CheckIn` | Registro de check-in durante servicio activo |
| `ChatDetailScreen` | `ChatDetail` | Chat en tiempo real por booking |
| `AddPetScreen` | `AddPetModal` | Crear / editar mascota (modal) |
| `LeaveReviewScreen` | `LeaveReview` | Dejar reseña post-servicio (modal) |
| `HostDashboardScreen` | `HostDashboard` | Panel del cuidador: 4 tabs (Publicaciones, Reservas, Reviews, Finanzas) |
| `ManageServiceScreen` | `ManageService` | Crear/editar Space o Visiter (modal) |
| `HostOnboardingScreen` | `HostOnboarding` | Formulario de postulación como cuidador |
| `TrustAndSafetyScreen` | `TrustAndSafety` | Políticas de seguridad y seguros |
| `InsuranceClaimScreen` | `InsuranceClaim` | Formulario de reclamo de seguro |
| `EditProfileScreen` | `EditProfile` | Editar perfil completo + avatar (modal) |
| `AdminScreen` | `Admin` | Panel de administración (solo admins) |
| `SearchFilterScreen` | `SearchModal` | Filtros avanzados de búsqueda |

---

## Base de Datos (Supabase)

### Tablas principales

| Tabla | Descripción |
|---|---|
| `profiles` | Usuarios (rol: owner/host, kyc_status, is_admin, onboarding_done, signed_contract_url) |
| `pets` | Mascotas de los owners |
| `spaces` | Alojamientos de los hosts |
| `visiters` | Servicios de visita domiciliaria de los hosts |
| `bookings` | Reservas (status: pending/active/completed/cancelled, payment_status: pending/receipt_submitted/paid/refunded) |
| `host_applications` | Postulaciones para ser cuidador |
| `messages` | Mensajes de chat por booking |
| `reviews` | Reseñas post-servicio |
| `insurance_claims` | Reclamos de seguro |

### Migrations aplicadas (en orden)
1. `20260406203712_init_schema.sql` — Schema base
2. `20260425_host_flow.sql` — approve_host RPC function
3. `20260425_insurance_claims.sql` — tabla insurance_claims
4. `20260425_seed_and_rls.sql` — RLS policies + datos de prueba
5. `20260425_storage_avatars.sql` — Storage bucket avatars
6. `20260425_stripe_payments.sql` — (Stripe no usado en Chile, dejado por compatibilidad)
7. `20260426_contracts_and_email.sql` — Edge function send-approval-email + bucket contracts
8. `20260426_profile_fields_and_admin.sql` — Campos adicionales en profiles + is_admin
9. `20260426_reviews.sql` — tabla reviews

### Migration PENDIENTE (debe correr en el dashboard de Supabase)
```sql
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'receipt_submitted', 'paid', 'refunded'));
```

### Función RPC importante
```sql
-- approve_host(target_user_id UUID)
-- Cambia role a 'host' en profiles
-- Se llama desde AdminScreen al aprobar una postulación
```

---

## Flujo de Pagos (Transferencia Bancaria)

No se usa Stripe (no disponible en Chile). El flujo es:

1. **Usuario reserva** → booking `status: pending`, `payment_status: pending`
2. **Usuario ve instrucciones** → `TransferInstructionsScreen` con datos bancarios de ApapachaPet
3. **Usuario sube comprobante** → imagen va a Supabase Storage bucket `receipts`, booking actualiza `payment_status: receipt_submitted`
4. **Admin confirma** → en `AdminScreen > tab Pagos`, el admin ve comprobantes pendientes y confirma → `payment_status: paid`, `status: active`

> ⚠️ **Pendiente**: Actualizar los datos bancarios reales en `TransferInstructionsScreen.tsx` (líneas ~20-27):
> ```ts
> const BANK_DETAILS = {
>   bank: 'BANCO_REAL',
>   accountType: 'Cuenta Corriente',
>   accountNumber: 'NUMERO_REAL',
>   rut: 'RUT_REAL',
>   name: 'NOMBRE_REAL',
>   email: 'apapachapet.app@gmail.com',
> };
> ```

---

## Flujo de Aprobación de Hosts

1. Host llena formulario en `HostOnboardingScreen` → crea registro en `host_applications` con `status: pending`
2. Admin va a `AdminScreen > tab Postulaciones` → ve solicitud pendiente
3. Admin hace click en **Aprobar** → llama `approve_host(user_id)` RPC + `host_applications.status = approved`
4. Se envía email automático con contrato via Edge Function `send-approval-email` (Resend)
5. Host recibe email, firma contrato, lo sube desde `ProfileScreen`
6. Host accede a `HostDashboardScreen` para crear sus servicios

---

## Iconos

Toda la app usa **Ionicons** de `@expo/vector-icons` (ya instalado, v15.0.3). NO se usan emojis como íconos funcionales. Emojis solo en contenido decorativo puntual (🐱 placeholder de foto de gato sin foto real).

Patrón de uso:
```tsx
import { Ionicons } from '@expo/vector-icons';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
// Uso:
<Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
```

---

## Assets de Logo

| Asset | Uso | Dimensiones | Notas |
|---|---|---|---|
| `LogoSplash.png` | `LoginScreen` — logo grande al centro | 1485×1485 | Circular, con marca "papachaPet by ЯR" |
| `LogoHeader.png` | `AppHeader` — header de todas las pantallas | 1485×1485 | Horizontal (icon + texto), con espacio vacío arriba/abajo → usar `resizeMode="cover"` |
| `favicon.png` / `icon.png` | App icon / favicon web | varios | LogoApp.png |

**Por qué `cover` en AppHeader**: la imagen tiene el logo en la banda horizontal central con mucho espacio vacío arriba y abajo. `cover` recorta ese espacio y muestra el logo de borde a borde.

---

## Variables de Entorno (.env)

```bash
# apapacha-mobile/.env (no commitear)
EXPO_PUBLIC_SUPABASE_URL=https://mzqvkzjxubuqpdnznigy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Estas variables también deben estar configuradas en el proyecto de Vercel (`apapacha-mobile`).

---

## Cambios de Esta Sesión (2026-05-01)

### Iconos profesionales (Ionicons en toda la app)
- `App.tsx` — Tabs de navegación (Home, Explore, Inbox, Bookings, Profile)
- `HomeScreen.tsx` — Acciones rápidas (Reservar, Historial, Mi gato, Emergencia)
- `BookingsScreen.tsx` — Status de reserva, tipo de servicio, estado de pago, botones (Chat, Cancelar, Reseñar, Repetir), empty state
- `ProfileScreen.tsx` — KYC status, editar mascota, alertas médicas, botones de negocio, menú de cuenta
- `AdminScreen.tsx` — Tabs del panel, tarjetas de estadísticas, tags de usuarios, botones aprobar/rechazar/confirmar

### AppHeader logo corregido
- Antes: `resizeMode="contain"` con dimensiones fijas → logo aparecía como cuadrado de 44px
- Ahora: `resizeMode="cover"` con imagen llenando absolutamente el contenedor → logo de borde a borde, espacio vacío recortado

### ManageServiceScreen — botón guardar visible
- El `ScrollView` no tenía `flex: 1` → en formularios largos el footer con "Publicar servicio" quedaba fuera de pantalla
- Fix: `style={{ flex: 1 }}` en ScrollView

### services — insert/update explícito
- `spaces.service.ts` y `visiters.service.ts`: cambiado de `.upsert()` a `.insert()` / `.update()` explícito para evitar fallos silenciosos de Supabase upsert

### AdminScreen — usuarios sin nombre
- Usuarios nuevos (full_name null) ahora muestran "(sin nombre)" en lugar de `undefined`

---

## Cambios de Sesiones Anteriores

### Sesión anterior (2026-04-29)
- **HomeScreen**: creado desde cero con datos reales de Supabase (primera mascota, próxima reserva, acciones rápidas)
- **SpaceDetailScreen / VisiterDetailScreen**: reescritos con datos reales (antes 100% hardcoded con ID '1' y 'v1')
- **BookingsScreen**: cancelar reserva, badge de estado de pago, repetir reserva, reseñar
- **TransferInstructionsScreen**: pantalla nueva para pago por transferencia + subida de comprobante
- **AdminScreen**: tab de Pagos para confirmar transferencias
- **Logos**: LoginScreen usa `LogoSplash.png`, AppHeader usa `LogoHeader.png`
- **app.json**: nombre "ApapachaPet", splash color #6B35A0

---

## Pendientes / Roadmap

### Alta prioridad
- [ ] **Datos bancarios reales** en `TransferInstructionsScreen.tsx`
- [ ] **Migration de pagos** en Supabase (ver SQL arriba)
- [ ] Verificar que `approve_host` RPC funciona correctamente en producción

### Media prioridad
- [ ] **Chat en tiempo real** — implementar Supabase Realtime en `ChatDetailScreen` (actualmente muestra mensajes pero sin subscripción live)
- [ ] **Fotos de servicios** — subida de imágenes en `ManageServiceScreen` (actualmente guarda `image_urls: []`)
- [ ] **Push notifications** — cuando llega mensaje o se aprueba reserva

### Baja prioridad
- [ ] **ExploreScreen** — aún tiene algunos emojis como íconos decorativos (no crítico)
- [ ] **Filtros de búsqueda** — `SearchFilterScreen` funcional pero puede mejorarse
- [ ] **Pasarela de pagos local** — WebPay / Khipu cuando sea viable

---

## Comandos Útiles

```bash
# Desarrollar
cd apapacha-mobile
npx expo start --web

# TypeScript check
npx tsc --noEmit

# Deploy a producción (SIEMPRE desde apapacha-mobile/)
npx vercel --prod --yes
```

---

## Arquitectura de Navegación

```
Stack Navigator (RootNavigator)
├── Login (si no hay sesión)
├── Onboarding (si onboarding_done = false)
├── ClientVerification (si kyc_status = 'pending')
├── MainTabs (Tab Navigator)
│   ├── Home (HomeScreen)
│   ├── Explore (ExploreScreen)
│   ├── Inbox (InboxScreen)
│   ├── Bookings (BookingsScreen)
│   └── Profile (ProfileScreen)
├── SpaceDetail
├── VisiterDetail
├── Checkout
├── TransferInstructions
├── PaymentSuccess
├── CheckIn
├── ChatDetail
├── AddPetModal (modal)
├── HostOnboarding (modal)
├── TrustAndSafety (modal)
├── InsuranceClaim (modal)
├── HostDashboard
├── EditProfile (modal)
├── LeaveReview (modal)
├── Admin
└── ManageService (modal)
```

---

## Theme / Colores

Todos los colores viven en `src/theme/colors.ts`. Colores principales:
- `colors.primary` — Púrpura principal `#6B35A0`
- `colors.primaryDark` — Púrpura oscuro
- `colors.accent` — Verde/teal para estados de éxito
- `colors.surface` — Blanco/fondo de tarjetas
- `colors.background` — Fondo general (gris muy claro)
- `colors.textMain` / `colors.textMuted` — Textos
- `colors.danger` / `colors.dangerBg` / `colors.dangerText` — Estados de error/peligro
- `colors.success` / `colors.successBg` / `colors.successText` — Estados de éxito
