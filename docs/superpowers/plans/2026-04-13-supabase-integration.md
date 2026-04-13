# Supabase Integration — Full MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Supabase replacing todos los mocks con auth real (Email OTP), base de datos con RLS, y chat en tiempo real.

**Architecture:** AuthContext global para la sesión + Service Layer por dominio. Las pantallas importan servicios y manejan su propio estado local con useState/useEffect.

**Tech Stack:** @supabase/supabase-js v2, React Context API, Supabase Realtime, AsyncStorage, Expo SDK 54, React Navigation v7

---

### Task 1: Database Schema, RLS & Trigger

**Files:**
- Create: `apapacha-mobile/supabase/migration_001_schema.sql` (referencia local)

- [ ] **Step 1: Abrir SQL Editor de Supabase**

Ve a `https://supabase.com/dashboard/project/mzqvkzjxubuqpdnznigy/sql/new` y ejecuta el siguiente SQL completo:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- profiles (extiende auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'owner' check (role in ('owner', 'host')),
  kyc_status text not null default 'pending' check (kyc_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

-- pets
create table public.pets (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  breed text not null default '',
  age_years int not null default 0,
  weight_kg numeric(4,1) not null default 0,
  sterilized boolean not null default false,
  medical_alerts text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);

-- spaces
create table public.spaces (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  location text not null default '',
  price_per_night int not null default 0,
  rating numeric(3,2) not null default 0,
  image_urls text[] not null default '{}',
  features text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- visiters
create table public.visiters (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  profession_title text not null default '',
  bio text not null default '',
  price_per_visit int not null default 0,
  rating numeric(3,2) not null default 0,
  total_visits int not null default 0,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- bookings
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete cascade not null,
  service_type text not null check (service_type in ('space', 'visiter')),
  service_id uuid not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'cancelled')),
  total_price int not null default 0,
  insurance_included boolean not null default true,
  created_at timestamptz not null default now()
);

-- messages
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- host_applications
create table public.host_applications (
  id uuid default uuid_generate_v4() primary key,
  applicant_id uuid references public.profiles(id) on delete cascade not null,
  service_type text not null check (service_type in ('space', 'visiter')),
  kyc_doc_url text,
  safety_evidence_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now()
);

-- Trigger: auto-crear profile al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, kyc_status)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'owner', 'pending');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.spaces enable row level security;
alter table public.visiters enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.host_applications enable row level security;

-- profiles policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- pets policies
create policy "Users can view own pets" on pets for select using (auth.uid() = owner_id);
create policy "Users can insert own pets" on pets for insert with check (auth.uid() = owner_id);
create policy "Users can update own pets" on pets for update using (auth.uid() = owner_id);
create policy "Users can delete own pets" on pets for delete using (auth.uid() = owner_id);

-- spaces policies
create policy "Authenticated users can view spaces" on spaces for select to authenticated using (active = true);
create policy "Hosts can create spaces" on spaces for insert with check (auth.uid() = host_id);
create policy "Hosts can update own spaces" on spaces for update using (auth.uid() = host_id);

-- visiters policies
create policy "Authenticated users can view visiters" on visiters for select to authenticated using (active = true);
create policy "Hosts can create visiter profiles" on visiters for insert with check (auth.uid() = host_id);
create policy "Hosts can update own visiter profile" on visiters for update using (auth.uid() = host_id);

-- bookings policies
create policy "Users can view own bookings" on bookings for select using (auth.uid() = owner_id);
create policy "Users can create bookings" on bookings for insert with check (auth.uid() = owner_id);
create policy "Users can update own bookings" on bookings for update using (auth.uid() = owner_id);

-- messages policies
create policy "Booking participants can view messages" on messages
  for select using (
    exists (select 1 from bookings where bookings.id = booking_id and bookings.owner_id = auth.uid())
  );
create policy "Booking participants can send messages" on messages
  for insert with check (
    auth.uid() = sender_id and
    exists (select 1 from bookings where bookings.id = booking_id and bookings.owner_id = auth.uid())
  );

-- host_applications policies
create policy "Users can view own application" on host_applications for select using (auth.uid() = applicant_id);
create policy "Users can submit application" on host_applications for insert with check (auth.uid() = applicant_id);

-- Realtime para messages
alter publication supabase_realtime add table messages;
```

- [ ] **Step 2: Verificar tablas creadas**

En el dashboard → Table Editor, confirmar que existen las 7 tablas: `profiles`, `pets`, `spaces`, `visiters`, `bookings`, `messages`, `host_applications`.

- [ ] **Step 3: Commit referencia local**

```bash
mkdir -p "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile/supabase"
```

Crea `apapacha-mobile/supabase/migration_001_schema.sql` con el SQL anterior y haz commit:

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/supabase/
git commit -m "chore: add supabase schema migration reference"
```

---

### Task 2: TypeScript Database Types

**Files:**
- Create: `apapacha-mobile/src/types/database.ts`

- [ ] **Step 1: Crear el archivo de tipos**

Crea `apapacha-mobile/src/types/database.ts`:

```typescript
export type UserRole = 'owner' | 'host';
export type KycStatus = 'pending' | 'verified' | 'rejected';
export type ServiceType = 'space' | 'visiter';
export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  kyc_status: KycStatus;
  created_at: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  age_years: number;
  weight_kg: number;
  sterilized: boolean;
  medical_alerts: string[];
  image_url: string | null;
  created_at: string;
}

export interface Space {
  id: string;
  host_id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  rating: number;
  image_urls: string[];
  features: string[];
  active: boolean;
  created_at: string;
}

export interface Visiter {
  id: string;
  host_id: string;
  name: string;
  profession_title: string;
  bio: string;
  price_per_visit: number;
  rating: number;
  total_visits: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  owner_id: string;
  pet_id: string;
  service_type: ServiceType;
  service_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  total_price: number;
  insurance_included: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface HostApplication {
  id: string;
  applicant_id: string;
  service_type: ServiceType;
  kyc_doc_url: string | null;
  safety_evidence_url: string | null;
  status: ApplicationStatus;
  submitted_at: string;
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/src/types/database.ts
git commit -m "feat: add supabase database typescript types"
```

---

### Task 3: AuthContext + Auth Service

**Files:**
- Create: `apapacha-mobile/src/context/AuthContext.tsx`
- Create: `apapacha-mobile/src/services/auth.service.ts`

- [ ] **Step 1: Crear `src/context/AuthContext.tsx`**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type { Profile } from '../types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  }

  async function refreshProfile() {
    if (session?.user.id) await fetchProfile(session.user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      profile,
      loading,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: Crear `src/services/auth.service.ts`**

```typescript
import { supabase } from '../../supabase';
import type { ServiceType } from '../types/database';

export async function sendOTP(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyOTP(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function completeKyc(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('profiles')
    .update({ kyc_status: 'verified' })
    .eq('id', user.id);
  if (error) throw error;
}

export async function applyAsHost(data: {
  service_type: ServiceType;
  kyc_doc_url?: string;
  safety_evidence_url?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('host_applications').insert({
    applicant_id: user.id,
    service_type: data.service_type,
    kyc_doc_url: data.kyc_doc_url ?? null,
    safety_evidence_url: data.safety_evidence_url ?? null,
    status: 'pending',
  });
  if (error) throw error;
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/src/context/ apapacha-mobile/src/services/auth.service.ts
git commit -m "feat: add AuthContext and auth service (OTP + KYC + host apply)"
```

---

### Task 4: LoginScreen — OTP Flow

**Files:**
- Modify: `apapacha-mobile/src/screens/LoginScreen.tsx`

- [ ] **Step 1: Reemplazar LoginScreen.tsx completo**

```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { sendOTP, verifyOTP } from '../services/auth.service';

export function LoginScreen() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendOTP(email.trim().toLowerCase());
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (token.length !== 6) return;
    setLoading(true);
    try {
      await verifyOTP(email.trim().toLowerCase(), token);
      // App.tsx detecta la sesión automáticamente via AuthContext
    } catch (e: any) {
      Alert.alert('Código incorrecto', e.message ?? 'El código no es válido o expiró');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoIcon}>🐾</Text>
          </View>
          <Text style={styles.brandName}>ApapachaPet</Text>
          <Text style={styles.brandSubtitle}>Hospitalidad Felina Premium</Text>
        </View>

        <View style={styles.authContainer}>
          {step === 'email' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.authButton, loading && styles.authButtonDisabled]}
                onPress={handleSendOTP}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.primaryDark} />
                  : <Text style={styles.authButtonText}>Continuar con email seguro</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.otpLabel}>Código enviado a {email}</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={token}
                onChangeText={setToken}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.authButton, loading && styles.authButtonDisabled]}
                onPress={handleVerifyOTP}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.primaryDark} />
                  : <Text style={styles.authButtonText}>Verificar código</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('email'); setToken(''); }}>
                <Text style={styles.backLink}>← Cambiar email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.trustDisclaimer}>
          <Text style={styles.trustTitle}>🔒 Política de Confianza Cero</Text>
          <Text style={styles.trustText}>
            En ApapachaPet la seguridad de tu gato es innegociable. Todas las cuentas nuevas
            (Dueños y Cuidadores) pasan por un cruce de antecedentes y validación de identidad
            antes de acceder al marketplace.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, justifyContent: 'space-between', padding: 30, paddingTop: 80, paddingBottom: 50 },
  brandContainer: { alignItems: 'center' },
  logoPlaceholder: { width: 90, height: 90, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  logoIcon: { fontSize: 40 },
  brandName: { fontSize: 36, fontWeight: '800', color: colors.surface, letterSpacing: -1, marginBottom: 8 },
  brandSubtitle: { fontSize: 16, color: colors.surface, opacity: 0.8, fontWeight: '500', letterSpacing: 0.5 },
  authContainer: { width: '100%', gap: 16 },
  input: { backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 16, color: colors.textMain, width: '100%' },
  otpInput: { textAlign: 'center', fontSize: 28, fontWeight: '800', letterSpacing: 8 },
  otpLabel: { color: colors.surface, opacity: 0.8, fontSize: 14, textAlign: 'center' },
  authButton: { backgroundColor: colors.surface, paddingVertical: 16, borderRadius: 12, alignItems: 'center', width: '100%' },
  authButtonDisabled: { opacity: 0.6 },
  authButtonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
  backLink: { color: colors.surface, opacity: 0.7, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  trustDisclaimer: { backgroundColor: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  trustTitle: { color: colors.surface, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  trustText: { color: colors.surface, opacity: 0.7, fontSize: 12, lineHeight: 18 },
});
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/src/screens/LoginScreen.tsx
git commit -m "feat: implement OTP email login in LoginScreen"
```

---

### Task 5: App.tsx — AuthProvider + Routing Condicional

**Files:**
- Modify: `apapacha-mobile/App.tsx`
- Modify: `apapacha-mobile/src/screens/ClientVerificationScreen.tsx`

- [ ] **Step 1: Reemplazar App.tsx completo**

```typescript
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { SpaceDetailScreen } from './src/screens/SpaceDetailScreen';
import { VisiterDetailScreen } from './src/screens/VisiterDetailScreen';
import { CheckInScreen } from './src/screens/CheckInScreen';
import { BookingsScreen } from './src/screens/BookingsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { HostDashboardScreen } from './src/screens/HostDashboardScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { ChatDetailScreen } from './src/screens/ChatDetailScreen';
import { AddPetScreen } from './src/screens/AddPetScreen';
import { SearchFilterScreen } from './src/screens/SearchFilterScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { HostOnboardingScreen } from './src/screens/HostOnboardingScreen';
import { ClientVerificationScreen } from './src/screens/ClientVerificationScreen';
import { TrustAndSafetyScreen } from './src/screens/TrustAndSafetyScreen';
import { colors } from './src/theme/colors';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

type TabIconName = 'compass' | 'compass-outline' | 'chatbubbles' | 'chatbubbles-outline' | 'calendar' | 'calendar-outline' | 'paw' | 'paw-outline';

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: TabIconName;
          if (route.name === 'Explore') iconName = focused ? 'compass' : 'compass-outline';
          else if (route.name === 'Inbox') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Bookings') iconName = focused ? 'calendar' : 'calendar-outline';
          else iconName = focused ? 'paw' : 'paw-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explorar' }} />
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: 'Mensajes' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Reservas' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      initialRouteName={profile?.kyc_status === 'pending' ? 'ClientVerification' : 'MainTabs'}
    >
      <Stack.Screen name="ClientVerification" component={ClientVerificationScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
      <Stack.Screen name="SearchModal" component={SearchFilterScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="SpaceDetail" component={SpaceDetailScreen} />
      <Stack.Screen name="VisiterDetail" component={VisiterDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="AddPetModal" component={AddPetScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="HostOnboarding" component={HostOnboardingScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="TrustAndSafety" component={TrustAndSafetyScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="HostDashboard" component={HostDashboardScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Actualizar ClientVerificationScreen — llamar completeKyc()**

Reemplazar la función `handleFinish` en `src/screens/ClientVerificationScreen.tsx`:

```typescript
// Agregar import al inicio (junto a los otros imports):
import { completeKyc } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

// Dentro del componente, añadir:
const { refreshProfile } = useAuth();

// Reemplazar handleFinish:
const handleFinish = async () => {
  if (!agreementSigned) {
    Alert.alert('Firma Requerida', 'Debes aceptar la declaración de Zero Trust para continuar.');
    return;
  }
  try {
    await completeKyc();
    await refreshProfile();
    navigation.navigate('MainTabs');
  } catch (e: any) {
    Alert.alert('Error', e.message ?? 'No se pudo completar la verificación');
  }
};
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/App.tsx apapacha-mobile/src/screens/ClientVerificationScreen.tsx
git commit -m "feat: wire AuthProvider and session-based routing in App.tsx"
```

---

### Task 6: Spaces & Visiters Services

**Files:**
- Create: `apapacha-mobile/src/services/spaces.service.ts`
- Create: `apapacha-mobile/src/services/visiters.service.ts`

- [ ] **Step 1: Crear `src/services/spaces.service.ts`**

```typescript
import { supabase } from '../../supabase';
import type { Space } from '../types/database';

export type SpaceFilters = {
  features?: string[];
};

export async function getSpaces(filters?: SpaceFilters): Promise<Space[]> {
  let query = supabase
    .from('spaces')
    .select('*')
    .eq('active', true)
    .order('rating', { ascending: false });

  if (filters?.features && filters.features.length > 0) {
    query = query.overlaps('features', filters.features);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSpaceById(id: string): Promise<Space> {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Crear `src/services/visiters.service.ts`**

```typescript
import { supabase } from '../../supabase';
import type { Visiter } from '../types/database';

export async function getVisiters(): Promise<Visiter[]> {
  const { data, error } = await supabase
    .from('visiters')
    .select('*')
    .eq('active', true)
    .order('rating', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getVisiterById(id: string): Promise<Visiter> {
  const { data, error } = await supabase
    .from('visiters')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/src/services/spaces.service.ts apapacha-mobile/src/services/visiters.service.ts
git commit -m "feat: add spaces and visiters services"
```

---

### Task 7: ExploreScreen — Datos Reales + Seed Data

**Files:**
- Modify: `apapacha-mobile/src/screens/ExploreScreen.tsx`

- [ ] **Step 1: Insertar seed data en Supabase**

Primero crear una cuenta en el app (Task 4). Luego en el SQL Editor de Supabase, reemplazar `'TU_UUID_AQUI'` con el UUID de tu profile (visible en Table Editor → profiles) y ejecutar:

```sql
insert into public.spaces (host_id, title, description, location, price_per_night, rating, image_urls, features)
values
(
  'TU_UUID_AQUI',
  'Depto Malla Completa Centro, 100% Catified',
  'Departamento acondicionado para gatos con mallas anti-escape en todos los vanos.',
  'Providencia, Santiago',
  15000, 4.96,
  '{"https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2000&auto=format&fit=crop"}',
  '{"Malla Completa","Rascadores Premium","Sin Otros Gatos"}'
),
(
  'TU_UUID_AQUI',
  'Casa con Patio Cerrado & Árboles Trepadores',
  'Casa familiar con patio completamente cerrado y cercado.',
  'Las Condes, Santiago',
  22000, 5.0,
  '{"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop"}',
  '{"Patio Cerrado","Árboles Trepadores","Sin Otros Gatos"}'
);

insert into public.visiters (host_id, name, profession_title, bio, price_per_visit, rating, total_visits, image_url)
values
(
  'TU_UUID_AQUI',
  'Roberto Valdés',
  'Auxiliar Veterinario Especialista',
  'Auxiliar veterinario con 8 años de experiencia especializado en felinos.',
  8500, 4.98, 342,
  'https://images.unsplash.com/photo-1537368910025-7028ba0a464a?q=80&w=1000&auto=format&fit=crop'
),
(
  'TU_UUID_AQUI',
  'Camila Ríos',
  'Top Rated Cat Walker',
  'Cuidadora certificada por CatWalkers Academy Chile.',
  6000, 4.85, 120,
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop'
);
```

- [ ] **Step 2: Reemplazar ExploreScreen.tsx completo**

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { SpaceCard } from '../components/SpaceCard';
import { VisiterCard } from '../components/VisiterCard';
import { SpaceCardSkeleton, VisiterCardSkeleton } from '../components/Skeleton';
import type { RootStackParamList } from '../types/navigation';
import type { Space, Visiter } from '../types/database';
import { getSpaces } from '../services/spaces.service';
import { getVisiters } from '../services/visiters.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['Patio Cerrado', 'Sitter Médico', 'Sin Otros Gatos', 'Rascadores Premium'];

export function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<'SPACES' | 'VISITERS'>('SPACES');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [visiters, setVisiters] = useState<Visiter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab, activeFilters]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'SPACES') {
        const data = await getSpaces(
          activeFilters.size > 0 ? { features: Array.from(activeFilters) } : undefined
        );
        setSpaces(data);
      } else {
        const data = await getVisiters();
        setVisiters(data);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.serviceToggleContainer}>
          <TouchableOpacity style={[styles.toggleBtn, activeTab === 'SPACES' && styles.toggleBtnActive]} onPress={() => setActiveTab('SPACES')} activeOpacity={0.8}>
            <Text style={[styles.toggleText, activeTab === 'SPACES' && styles.toggleTextActive]}>🏠 Alojamiento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, activeTab === 'VISITERS' && styles.toggleBtnActive]} onPress={() => setActiveTab('VISITERS')} activeOpacity={0.8}>
            <Text style={[styles.toggleText, activeTab === 'VISITERS' && styles.toggleTextActive]}>🚗 Visitas en Casa</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => navigation.navigate('SearchModal')}>
          <View style={styles.searchIconPlaceholder}><Text>🔍</Text></View>
          <View style={styles.searchTexts}>
            <Text style={styles.searchTitle}>{activeTab === 'SPACES' ? '¿Dónde hospedará tu compañero?' : '¿Dónde necesitas tu visita?'}</Text>
            <Text style={styles.searchSubtitle}>Cualquier lugar • Fechas • 1 Huésped</Text>
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'SPACES' && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            data={FILTERS}
            keyExtractor={item => item}
            renderItem={({ item }) => {
              const isActive = activeFilters.has(item);
              return (
                <TouchableOpacity style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => toggleFilter(item)}>
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={i => String(i)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={() => activeTab === 'SPACES' ? <SpaceCardSkeleton /> : <VisiterCardSkeleton />}
        />
      ) : activeTab === 'SPACES' ? (
        <FlatList
          data={spaces}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SpaceCard
              id={item.id}
              title={item.title}
              location={item.location}
              pricePerNight={item.price_per_night}
              rating={item.rating}
              imageUrl={item.image_urls[0] ?? ''}
              onPress={id => navigation.navigate('SpaceDetail', { id })}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay espacios disponibles.</Text>}
        />
      ) : (
        <FlatList
          data={visiters}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <VisiterCard
              id={item.id}
              name={item.name}
              professionTitle={item.profession_title}
              pricePerVisit={item.price_per_visit}
              rating={item.rating}
              totalVisits={item.total_visits}
              imageUrl={item.image_url ?? ''}
              onPress={id => navigation.navigate('VisiterDetail', { id })}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay visiters disponibles.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5, backgroundColor: colors.surface },
  serviceToggleContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 30, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 26 },
  toggleBtnActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.textMain, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: colors.border },
  searchIconPlaceholder: { marginLeft: 8, marginRight: 16 },
  searchTexts: { flex: 1 },
  searchTitle: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  searchSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  filterContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textMain },
  filterTextActive: { color: colors.surface },
  listContainer: { padding: 20, paddingTop: 16, paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15 },
});
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/src/screens/ExploreScreen.tsx
git commit -m "feat: ExploreScreen now loads real spaces and visiters from Supabase"
```

---

### Task 8: Pets Service + ProfileScreen + AddPetScreen

**Files:**
- Create: `apapacha-mobile/src/services/pets.service.ts`
- Modify: `apapacha-mobile/src/screens/ProfileScreen.tsx`
- Modify: `apapacha-mobile/src/screens/AddPetScreen.tsx`

- [ ] **Step 1: Crear `src/services/pets.service.ts`**

```typescript
import { supabase } from '../../supabase';
import type { Pet } from '../types/database';

export async function getMyPets(): Promise<Pet[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addPet(petData: {
  name: string;
  breed: string;
  age_years: number;
  weight_kg: number;
  sterilized: boolean;
  medical_alerts: string[];
  image_url?: string;
}): Promise<Pet> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('pets')
    .insert({ ...petData, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Actualizar ProfileScreen — datos reales + signOut**

Reemplazar las siguientes secciones en `src/screens/ProfileScreen.tsx`:

Agregar imports al inicio:
```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Pet } from '../types/database';
import { getMyPets } from '../services/pets.service';
```

Reemplazar el inicio del componente `ProfileScreen`:
```typescript
export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, signOut } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    getMyPets().then(setPets).catch(console.error);
  }, []);
```

Reemplazar el bloque `ownerCard` para mostrar datos reales:
```typescript
<View style={styles.ownerCard}>
  <View style={styles.avatarPlaceholder}>
    <Text style={styles.avatarText}>
      {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : '??'}
    </Text>
  </View>
  <View style={styles.ownerInfo}>
    <Text style={styles.ownerName}>{profile?.full_name || 'Mi Perfil'}</Text>
    <Text style={styles.ownerStatus}>
      {profile?.kyc_status === 'verified' ? '✓ Identidad Verificada' : '⏳ Verificación Pendiente'}
    </Text>
  </View>
</View>
```

Reemplazar el renderizado de mascotas para usar `pets` del estado:
```typescript
{pets.map(pet => (
  <View key={pet.id} style={styles.catCard}>
    <View style={styles.catHeader}>
      {pet.image_url ? (
        <Image source={{ uri: pet.image_url }} style={styles.catImage} />
      ) : (
        <View style={[styles.catImage, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 32 }}>🐱</Text>
        </View>
      )}
      <View style={styles.catInfo}>
        <Text style={styles.catName}>{pet.name}</Text>
        <Text style={styles.catDetails}>{pet.breed} • {pet.age_years} años</Text>
        <Text style={styles.catDetails}>{pet.sterilized ? 'Esterilizado' : 'No esterilizado'} • {pet.weight_kg} kg</Text>
      </View>
    </View>
    {pet.medical_alerts.length > 0 && (
      <View style={styles.alertBlock}>
        <Text style={styles.alertTitle}>⚠️ Alertas Médicas (Estricto)</Text>
        {pet.medical_alerts.map((alert, i) => (
          <Text key={i} style={styles.alertText}>• {alert}</Text>
        ))}
      </View>
    )}
  </View>
))}
```

Reemplazar el botón "Cerrar Sesión":
```typescript
<TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={signOut}>
  <Text style={[styles.menuItemText, { color: colors.danger }]}>Cerrar Sesión</Text>
</TouchableOpacity>
```

- [ ] **Step 3: Actualizar AddPetScreen — guardar en Supabase**

Agregar imports al inicio de `src/screens/AddPetScreen.tsx`:
```typescript
import { addPet } from '../services/pets.service';
```

Reemplazar la función del botón submit (actualmente `onPress={() => navigation.goBack()}`):
```typescript
const handleSubmit = async () => {
  if (!name.trim()) {
    Alert.alert('Nombre requerido', 'Ingresa el nombre de tu mascota.');
    return;
  }
  try {
    await addPet({
      name: name.trim(),
      breed: '',
      age_years: parseInt(age) || 0,
      weight_kg: parseFloat(weight) || 0,
      sterilized: false,
      medical_alerts: [
        allergies.trim(),
        medication.trim(),
      ].filter(Boolean),
      image_url: photoUri ?? undefined,
    });
    navigation.goBack();
  } catch (e: any) {
    Alert.alert('Error', e.message ?? 'No se pudo guardar la mascota');
  }
};
```

Actualizar el botón submit para usar `handleSubmit`:
```typescript
<TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
  <Text style={styles.submitBtnText}>Validar y Registrar Perfil</Text>
</TouchableOpacity>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/src/services/pets.service.ts apapacha-mobile/src/screens/ProfileScreen.tsx apapacha-mobile/src/screens/AddPetScreen.tsx
git commit -m "feat: pets service, real profile data, and addPet wired to Supabase"
```

---

### Task 9: Bookings Service + BookingsScreen + CheckoutScreen

**Files:**
- Create: `apapacha-mobile/src/services/bookings.service.ts`
- Modify: `apapacha-mobile/src/screens/BookingsScreen.tsx`
- Modify: `apapacha-mobile/src/screens/CheckoutScreen.tsx`

- [ ] **Step 1: Crear `src/services/bookings.service.ts`**

```typescript
import { supabase } from '../../supabase';
import type { Booking, BookingStatus, ServiceType } from '../types/database';

export async function getMyBookings(): Promise<Booking[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBooking(bookingData: {
  pet_id: string;
  service_type: ServiceType;
  service_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
}): Promise<Booking> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...bookingData,
      owner_id: user.id,
      status: 'pending',
      insurance_included: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Reemplazar BookingsScreen.tsx completo**

```typescript
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Booking } from '../types/database';
import { getMyBookings } from '../services/bookings.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function BookingsScreen() {
  const navigation = useNavigation<Nav>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  async function loadBookings() {
    try {
      const data = await getMyBookings();
      setBookings(data);
    } catch (e) {
      console.error('Error loading bookings:', e);
    } finally {
      setLoading(false);
    }
  }

  const active = bookings.filter(b => b.status === 'active' || b.status === 'pending');
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
  const fmt = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reservas</Text>
      </View>
      <FlatList
        data={[...active, ...past]}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        ListHeaderComponent={
          active.length > 0 ? <Text style={styles.sectionTitle}>En curso y próximas</Text> : null
        }
        renderItem={({ item, index }) => {
          const isFirstPast = index === active.length;
          return (
            <>
              {isFirstPast && past.length > 0 && (
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Historial</Text>
              )}
              {(item.status === 'active' || item.status === 'pending') ? (
                <TouchableOpacity
                  style={styles.cardActive}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('ChatDetail', { id: item.id })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.statusBadge}>{item.status === 'active' ? 'En Curso' : 'Pendiente'}</Text>
                    <Text style={styles.dates}>{fmt(item.start_date)} - {fmt(item.end_date)}</Text>
                  </View>
                  <Text style={styles.title}>{item.service_type === 'space' ? '🏠 Alojamiento' : '🚗 Visita Domiciliaria'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.cardPast}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.statusBadgePast}>{item.status === 'completed' ? 'Completada' : 'Cancelada'}</Text>
                    <Text style={styles.dates}>{fmt(item.start_date)} - {fmt(item.end_date)}</Text>
                  </View>
                  <Text style={styles.title}>{item.service_type === 'space' ? '🏠 Alojamiento' : '🚗 Visita Domiciliaria'}</Text>
                </View>
              )}
            </>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No tienes reservas aún.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.surface },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textMain, letterSpacing: -0.5 },
  scrollContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain, marginBottom: 16 },
  cardActive: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.primary, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { backgroundColor: colors.primary, color: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: '800' },
  statusBadgePast: { backgroundColor: colors.background, color: colors.textMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: '800' },
  dates: { fontSize: 13, color: colors.textMuted },
  title: { fontSize: 16, fontWeight: '700', color: colors.textMain },
  cardPast: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16, opacity: 0.7 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
});
```

- [ ] **Step 3: Actualizar CheckoutScreen — llamar createBooking()**

Reemplazar `CheckoutScreen.tsx` completo:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Space, Visiter, Pet } from '../types/database';
import { getSpaceById } from '../services/spaces.service';
import { getVisiterById } from '../services/visiters.service';
import { getMyPets } from '../services/pets.service';
import { createBooking } from '../services/bookings.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Checkout'>;

const APP_FEE = 4500;
const INSURANCE_FEE = 2500;
const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`;

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { id, type } = route.params;

  const [service, setService] = useState<Space | Visiter | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Demo dates (2 nights from today)
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  const endDate = new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0];
  const nights = 2;

  useEffect(() => {
    Promise.all([
      type === 'space' ? getSpaceById(id) : getVisiterById(id),
      getMyPets(),
    ])
      .then(([svc, myPets]) => {
        setService(svc);
        setPets(myPets);
        if (myPets.length > 0) setSelectedPet(myPets[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, type]);

  const basePrice = service
    ? type === 'space'
      ? (service as Space).price_per_night * nights
      : (service as Visiter).price_per_visit
    : 0;
  const grandTotal = basePrice + APP_FEE + INSURANCE_FEE;

  const handleConfirm = async () => {
    if (!selectedPet) {
      Alert.alert('Mascota requerida', 'Añade una mascota en tu perfil antes de reservar.');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createBooking({
        pet_id: selectedPet.id,
        service_type: type,
        service_id: id,
        start_date: startDate,
        end_date: endDate,
        total_price: grandTotal,
      });
      navigation.navigate('CheckIn', { bookingId: booking.id });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo confirmar la reserva');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmar y Pagar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {service && (
          <View style={styles.serviceCard}>
            <Image
              source={{ uri: type === 'space' ? (service as Space).image_urls[0] : (service as Visiter).image_url ?? '' }}
              style={styles.serviceImage}
            />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceSubtitle}>{type === 'space' ? 'Hospedaje' : 'Visita Domiciliaria'}</Text>
              <Text style={styles.serviceTitle}>{type === 'space' ? (service as Space).title : (service as Visiter).name}</Text>
              <Text style={styles.serviceRating}>⭐ {service.rating}</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Tu Reserva</Text>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Fechas</Text>
            <Text style={styles.rowValue}>{startDate} - {endDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Huésped</Text>
            <Text style={styles.rowValue}>{selectedPet ? selectedPet.name : 'Sin mascota seleccionada'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Detalle de Precios</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceConcept}>
              {type === 'space'
                ? `${fmt((service as Space)?.price_per_night ?? 0)} x ${nights} noches`
                : 'Visita domiciliaria'
              }
            </Text>
            <Text style={styles.priceNumber}>{fmt(basePrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceConcept}>Tarifa de Servicio (ApapachaPet)</Text>
            <Text style={styles.priceNumber}>{fmt(APP_FEE)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceConcept, { color: colors.success, fontWeight: '600' }]}>Malla de Seguro Zero Trust</Text>
            <Text style={styles.priceNumber}>{fmt(INSURANCE_FEE)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total (CLP)</Text>
            <Text style={styles.totalValue}>{fmt(grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Política de Cancelación Estricta</Text>
          <Text style={styles.policyText}>El Seguro Zero Trust no es reembolsable.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleConfirm}
          activeOpacity={0.8}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.submitBtnText}>Pagar e Ir al Check-in</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  content: { padding: 20, paddingBottom: 80 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 24 },
  serviceImage: { width: 100, height: 80, borderRadius: 8, marginRight: 16 },
  serviceInfo: { flex: 1 },
  serviceSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  serviceRating: { fontSize: 12, fontWeight: '600', color: colors.textMain },
  sectionBlock: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.textMain, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.textMain },
  rowValue: { fontSize: 15, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 8, marginBottom: 24 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  priceConcept: { fontSize: 15, color: colors.textMuted },
  priceNumber: { fontSize: 15, color: colors.textMain },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  totalValue: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  policyText: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/src/services/bookings.service.ts apapacha-mobile/src/screens/BookingsScreen.tsx apapacha-mobile/src/screens/CheckoutScreen.tsx
git commit -m "feat: bookings service, real BookingsScreen, and Checkout creates real bookings"
```

---

### Task 10: Messages Service + InboxScreen + ChatDetailScreen (Realtime)

**Files:**
- Create: `apapacha-mobile/src/services/messages.service.ts`
- Modify: `apapacha-mobile/src/screens/InboxScreen.tsx`
- Modify: `apapacha-mobile/src/screens/ChatDetailScreen.tsx`

- [ ] **Step 1: Crear `src/services/messages.service.ts`**

```typescript
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type { Message } from '../types/database';

export async function getMessages(bookingId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(bookingId: string, content: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('messages').insert({
    booking_id: bookingId,
    sender_id: user.id,
    content,
  });
  if (error) throw error;
}

export function subscribeToMessages(
  bookingId: string,
  callback: (msg: Message) => void
): RealtimeChannel {
  return supabase
    .channel(`messages:${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`,
      },
      payload => callback(payload.new as Message)
    )
    .subscribe();
}
```

- [ ] **Step 2: Reemplazar InboxScreen.tsx completo**

```typescript
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Booking } from '../types/database';
import { getMyBookings } from '../services/bookings.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function InboxScreen() {
  const navigation = useNavigation<Nav>();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useFocusEffect(
    useCallback(() => {
      getMyBookings()
        .then(data => setBookings(data.filter(b => b.status === 'active' || b.status === 'pending')))
        .catch(console.error);
    }, [])
  );

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ChatDetail', { id: item.id })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{item.service_type === 'space' ? '🏠' : '🚗'}</Text>
            </View>
            <View style={styles.messageContent}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {item.service_type === 'space' ? 'Alojamiento' : 'Visita Domiciliaria'}
                </Text>
                <Text style={styles.time}>{fmt(item.start_date)}</Text>
              </View>
              <Text style={styles.snippet} numberOfLines={1}>
                {item.status === 'pending' ? 'Esperando confirmación...' : 'Reserva activa — toca para chatear'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No tienes mensajes aún.</Text>
          </View>
        }
        contentContainerStyle={bookings.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textMain, letterSpacing: -0.5 },
  chatRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 28 },
  messageContent: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, color: colors.textMain, fontWeight: '700' },
  time: { fontSize: 13, color: colors.textMuted },
  snippet: { flex: 1, fontSize: 14, color: colors.textMuted },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
});
```

- [ ] **Step 3: Reemplazar ChatDetailScreen.tsx completo**

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Message } from '../types/database';
import { getMessages, sendMessage, subscribeToMessages } from '../services/messages.service';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ChatDetail'>;

export function ChatDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const { id: bookingId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    getMessages(bookingId).then(setMessages).catch(console.error);
    channelRef.current = subscribeToMessages(bookingId, newMsg => {
      setMessages(prev => [...prev, newMsg]);
    });
    return () => { channelRef.current?.unsubscribe(); };
  }, [bookingId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      await sendMessage(bookingId, text);
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>Chat de Reserva</Text>
        <View style={styles.placeholderSpace} />
      </View>

      <View style={styles.trustBanner}>
        <Text style={styles.trustBannerText}>⚠️ Por tu seguridad, nunca realices pagos fuera de la plataforma ApapachaPet.</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatArea}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(msg => {
            const isMine = msg.sender_id === user?.id;
            return (
              <View key={msg.id} style={isMine ? styles.bubbleSent : styles.bubbleReceived}>
                <Text style={isMine ? styles.textSent : styles.textReceived}>{msg.content}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.inputBox}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary },
  headerName: { fontSize: 18, fontWeight: '700', color: colors.textMain },
  placeholderSpace: { width: 40 },
  trustBanner: { backgroundColor: colors.warningBg, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.warningBorder },
  trustBannerText: { fontSize: 12, color: colors.warningText, textAlign: 'center', fontWeight: '600' },
  chatArea: { padding: 16, paddingBottom: 40 },
  bubbleReceived: { backgroundColor: colors.surface, padding: 14, borderRadius: 18, borderBottomLeftRadius: 4, alignSelf: 'flex-start', maxWidth: '80%', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  textReceived: { fontSize: 15, color: colors.textMain, lineHeight: 20 },
  bubbleSent: { backgroundColor: colors.primary, padding: 14, borderRadius: 18, borderBottomRightRadius: 4, alignSelf: 'flex-end', maxWidth: '80%', marginBottom: 12 },
  textSent: { fontSize: 15, color: colors.surface, lineHeight: 20 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  inputBox: { flex: 1, backgroundColor: colors.background, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, fontSize: 15, color: colors.textMain, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  sendButtonDisabled: { backgroundColor: colors.border },
  sendIcon: { color: colors.surface, fontSize: 16, fontWeight: '800' },
});
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/src/services/messages.service.ts apapacha-mobile/src/screens/InboxScreen.tsx apapacha-mobile/src/screens/ChatDetailScreen.tsx
git commit -m "feat: messages service with Realtime, InboxScreen and ChatDetailScreen wired to Supabase"
```

---

### Task 11: HostOnboardingScreen — applyAsHost

**Files:**
- Modify: `apapacha-mobile/src/screens/HostOnboardingScreen.tsx`

- [ ] **Step 1: Agregar imports y wiring al botón final**

Agregar al inicio de `src/screens/HostOnboardingScreen.tsx`:
```typescript
import { Alert } from 'react-native';
import { applyAsHost } from '../services/auth.service';
```

Agregar estado dentro del componente:
```typescript
const [submitting, setSubmitting] = useState(false);
```

Reemplazar la función `handleNext`:
```typescript
const handleNext = async () => {
  if (step < 3) {
    setStep(step + 1);
    return;
  }
  setSubmitting(true);
  try {
    await applyAsHost({ service_type: role === 'Alojamiento' ? 'space' : 'visiter' });
    Alert.alert(
      'Solicitud Enviada',
      'Tu postulación está en revisión. Te notificaremos pronto.',
      [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]
    );
  } catch (e: any) {
    Alert.alert('Error', e.message ?? 'No se pudo enviar la solicitud');
  } finally {
    setSubmitting(false);
  }
};
```

Agregar `import { ActivityIndicator } from 'react-native';` al import de react-native existente y actualizar el botón final:
```typescript
<TouchableOpacity style={styles.nextBtn} onPress={handleNext} disabled={submitting}>
  {submitting
    ? <ActivityIndicator color={colors.surface} />
    : <Text style={styles.nextBtnText}>{step === 3 ? 'Enviar Solicitud a Evaluación Central' : 'Continuar'}</Text>
  }
</TouchableOpacity>
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit final**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet"
git add apapacha-mobile/src/screens/HostOnboardingScreen.tsx
git commit -m "feat: HostOnboardingScreen submits real host application to Supabase"
```

---

## Verificación End-to-End

Una vez completadas todas las tareas, verificar el flujo completo:

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile" && npx expo start
```

1. **Login**: ingresar email real → recibir código → verificar → pantalla KYC
2. **KYC**: aceptar declaración → navegar a MainTabs
3. **Explore**: ver spaces y visiters reales de Supabase
4. **Profile**: ver nombre real del perfil → añadir mascota → aparece en el perfil
5. **Checkout**: desde un SpaceDetail → confirmar → crea booking real → vai a CheckIn
6. **Bookings**: ver la reserva creada
7. **Chat**: desde Bookings → ChatDetail → enviar mensaje → ver en tiempo real
8. **HostOnboarding**: desde Perfil → enviar postulación → aparece en `host_applications`
9. **Sign Out**: botón en Perfil → vuelve a LoginScreen
