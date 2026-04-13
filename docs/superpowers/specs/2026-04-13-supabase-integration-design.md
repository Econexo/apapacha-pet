# Supabase Integration Design — ApapachaPet

**Date:** 2026-04-13  
**Scope:** Full MVP — Auth, Database, Realtime Chat  
**Supabase Project:** `mzqvkzjxubuqpdnznigy`

---

## Decisions

| Topic | Decision | Reason |
|---|---|---|
| Auth method | Email OTP (6-digit code) | Más seguro: elimina contraseñas débiles, resiste credential stuffing |
| Roles | Owner por defecto, Host por aprobación | Alineado con flujo HostOnboardingScreen existente |
| Scope | Full MVP de una vez | Auth + DB + Realtime + reemplazo de todos los mocks |
| Architecture | AuthContext + Service Layer | Sin dependencias extra, separación limpia, encaja con el estilo del código |

---

## Architecture

```
apapacha-mobile/
  supabase.ts              ← cliente Supabase (ya existe, configurado con env vars)
  src/
    context/
      AuthContext.tsx      ← sesión global: user, profile, loading, signOut
    services/
      auth.service.ts      ← sendOTP, verifyOTP, signOut, applyAsHost
      spaces.service.ts    ← getSpaces, getSpaceById
      visiters.service.ts  ← getVisiters, getVisiterById
      pets.service.ts      ← getMyPets, addPet
      bookings.service.ts  ← getMyBookings, createBooking, updateBookingStatus
      messages.service.ts  ← getMessages, sendMessage, subscribeToMessages
    types/
      navigation.ts        ← ya existe
      database.ts          ← tipos generados desde Supabase (supabase gen types)
```

---

## Database Schema

### `profiles`
Extiende `auth.users`. Se crea automáticamente vía trigger al registrarse.

| Column | Type | Notes |
|---|---|---|
| id | uuid | FK → auth.users.id |
| full_name | text | |
| avatar_url | text | nullable |
| role | enum | `owner` \| `host` |
| kyc_status | enum | `pending` \| `verified` \| `rejected` |
| created_at | timestamptz | |

### `pets`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| owner_id | uuid | FK → profiles.id |
| name | text | |
| breed | text | |
| age_years | int | |
| weight_kg | numeric | |
| sterilized | boolean | |
| medical_alerts | text[] | array de alertas médicas |
| image_url | text | nullable |
| created_at | timestamptz | |

### `spaces`
Listings de alojamiento (Hospedaje Catificado).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| host_id | uuid | FK → profiles.id |
| title | text | |
| description | text | |
| location | text | |
| price_per_night | int | CLP |
| rating | numeric | 0.0 - 5.0 |
| image_urls | text[] | array de imágenes |
| features | text[] | ej: ['Malla Completa', 'Patio Cerrado'] |
| active | boolean | default true |
| created_at | timestamptz | |

### `visiters`
Perfiles de cuidadores a domicilio (Visita Domiciliaria).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| host_id | uuid | FK → profiles.id |
| name | text | |
| profession_title | text | |
| bio | text | |
| price_per_visit | int | CLP |
| rating | numeric | 0.0 - 5.0 |
| total_visits | int | default 0 |
| image_url | text | nullable |
| active | boolean | default true |
| created_at | timestamptz | |

### `bookings`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| owner_id | uuid | FK → profiles.id |
| pet_id | uuid | FK → pets.id |
| service_type | enum | `space` \| `visiter` |
| service_id | uuid | FK → spaces.id o visiters.id |
| start_date | date | |
| end_date | date | |
| status | enum | `pending` \| `active` \| `completed` \| `cancelled` |
| total_price | int | CLP |
| insurance_included | boolean | default true |
| created_at | timestamptz | |

### `messages`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| booking_id | uuid | FK → bookings.id |
| sender_id | uuid | FK → profiles.id |
| content | text | |
| created_at | timestamptz | |

### `host_applications`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| applicant_id | uuid | FK → profiles.id |
| service_type | enum | `space` \| `visiter` |
| kyc_doc_url | text | nullable |
| safety_evidence_url | text | nullable |
| status | enum | `pending` \| `approved` \| `rejected` |
| submitted_at | timestamptz | |

---

## Row Level Security (RLS)

RLS activado en **todas** las tablas. Políticas:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | own row only | on signup (trigger) | own row only | — |
| pets | own pets only | authenticated | own pets only | own pets only |
| spaces | all authenticated | host only | own spaces only | own spaces only |
| visiters | all authenticated | host only | own record only | own record only |
| bookings | own bookings only | owner only | owner or host | — |
| messages | booking participants only | booking participants | — | — |
| host_applications | own application | authenticated | — | — |

---

## Auth Flow

```
LoginScreen
  ├── usuario ingresa email
  ├── sendOTP(email) → Supabase envía código de 6 dígitos (expira 10 min)
  ├── usuario ingresa código
  ├── verifyOTP(email, token) → Supabase valida y crea sesión
  ├── nuevo usuario → ClientVerificationScreen (KYC) → MainTabs
  └── usuario existente → MainTabs directamente

AuthContext (global, wrapping NavigationContainer)
  ├── escucha supabase.auth.onAuthStateChange
  ├── expone: user, session, profile, loading, signOut
  └── redirige a Login si no hay sesión activa
```

**Seguridad:**
- OTP expira en 10 minutos
- `persistSession: true` + `AsyncStorage` (ya configurado)
- `detectSessionInUrl: false` (ya configurado, correcto para RN)
- `anon key` es pública por diseño — nunca usar `service_role` en cliente
- JWT del usuario limita acceso vía RLS en cada query

---

## Services API

### `auth.service.ts`
```ts
sendOTP(email: string): Promise<void>
verifyOTP(email: string, token: string): Promise<Session>
signOut(): Promise<void>
applyAsHost(data: HostApplicationData): Promise<void>
```

### `spaces.service.ts`
```ts
getSpaces(filters?: SpaceFilters): Promise<Space[]>
getSpaceById(id: string): Promise<Space>
```

### `visiters.service.ts`
```ts
getVisiters(filters?: VisiterFilters): Promise<Visiter[]>
getVisiterById(id: string): Promise<Visiter>
```

### `pets.service.ts`
```ts
getMyPets(): Promise<Pet[]>
addPet(data: NewPetData): Promise<Pet>
```

### `bookings.service.ts`
```ts
getMyBookings(): Promise<Booking[]>
createBooking(data: NewBookingData): Promise<Booking>
updateBookingStatus(id: string, status: BookingStatus): Promise<void>
```

### `messages.service.ts`
```ts
getMessages(bookingId: string): Promise<Message[]>
sendMessage(bookingId: string, content: string): Promise<void>
subscribeToMessages(bookingId: string, callback: (msg: Message) => void): RealtimeChannel
```

---

## Mock Replacement Map

| Screen | Remove | Replace with |
|---|---|---|
| `ExploreScreen` | `MOCK_SPACES`, `MOCK_VISITERS` | `getSpaces()`, `getVisiters()` |
| `BookingsScreen` | `MOCK_BOOKINGS` | `getMyBookings()` |
| `InboxScreen` | mock estático | `getMyBookings()` filtrado con mensajes |
| `ChatDetailScreen` | mock estático | `getMessages()` + `subscribeToMessages()` |
| `ProfileScreen` | datos hardcodeados | `profile` del AuthContext + `getMyPets()` |
| `AddPetScreen` | navegación sin persistencia | `addPet()` |
| `CheckoutScreen` | sin lógica real | `createBooking()` |

---

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=https://mzqvkzjxubuqpdnznigy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
```

Protegido en `.gitignore` (`.env*`).
