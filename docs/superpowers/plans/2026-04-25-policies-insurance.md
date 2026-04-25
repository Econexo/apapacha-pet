# Policies & Insurance Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade TrustAndSafetyScreen with expandable policy sections and add an Insurance Claims flow so users can report incidents, creating a ticket in Supabase.

**Architecture:** TrustAndSafetyScreen gains collapsible accordion sections using local state (no external library). A new `InsuranceClaimScreen` presents a form that inserts into an `insurance_claims` Supabase table. A "Reportar Siniestro" button in TrustAndSafety navigates to this form. The navigation type list gains `InsuranceClaim`. The screen is registered in `App.tsx` as a modal.

**Tech Stack:** React Native, Supabase, existing navigation and auth patterns

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260425_insurance_claims.sql` | Create | Create `insurance_claims` table with RLS |
| `apapacha-mobile/src/services/claims.service.ts` | Create | `submitClaim()` service function |
| `apapacha-mobile/src/screens/TrustAndSafetyScreen.tsx` | Modify | Expandable accordion sections + CTA to claim form |
| `apapacha-mobile/src/screens/InsuranceClaimScreen.tsx` | Create | Claim submission form |
| `apapacha-mobile/src/types/navigation.ts` | Modify | Add `InsuranceClaim` route |
| `apapacha-mobile/App.tsx` | Modify | Register `InsuranceClaim` as modal screen |

---

### Task 1: Database Migration — insurance_claims table

**Files:**
- Create: `supabase/migrations/20260425_insurance_claims.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260425_insurance_claims.sql

CREATE TABLE public.insurance_claims (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claimant_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id    UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('escape', 'injury', 'illness', 'property_damage', 'other')),
  description   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

-- Users can create and read their own claims
CREATE POLICY "Users insert own claims" ON public.insurance_claims
  FOR INSERT WITH CHECK (auth.uid() = claimant_id);

CREATE POLICY "Users read own claims" ON public.insurance_claims
  FOR SELECT USING (auth.uid() = claimant_id);
```

- [ ] **Step 2: Apply in Supabase SQL Editor**

Paste and run.
Expected: "Success. No rows returned."

Verify:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'insurance_claims';
-- Returns: id, claimant_id, booking_id, incident_type, description, status, submitted_at, resolved_at
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260425_insurance_claims.sql
git commit -m "feat: add insurance_claims table with RLS"
```

---

### Task 2: claims.service.ts

**Files:**
- Create: `apapacha-mobile/src/services/claims.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { supabase } from '../../supabase';

export type IncidentType = 'escape' | 'injury' | 'illness' | 'property_damage' | 'other';

export interface ClaimInput {
  booking_id?: string;
  incident_type: IncidentType;
  description: string;
}

export async function submitClaim(input: ClaimInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { error } = await supabase.from('insurance_claims').insert({
    claimant_id:   user.id,
    booking_id:    input.booking_id ?? null,
    incident_type: input.incident_type,
    description:   input.description,
  });
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add apapacha-mobile/src/services/claims.service.ts
git commit -m "feat: add claims.service.ts"
```

---

### Task 3: Update navigation types

**Files:**
- Modify: `apapacha-mobile/src/types/navigation.ts`

- [ ] **Step 1: Add InsuranceClaim to RootStackParamList**

Replace the content of `apapacha-mobile/src/types/navigation.ts` with:

```typescript
export type RootStackParamList = {
  Login: undefined;
  ClientVerification: undefined;
  MainTabs: undefined;
  SearchModal: undefined;
  SpaceDetail: { id: string };
  VisiterDetail: { id: string };
  Checkout: { id: string; type: 'space' | 'visiter' };
  PaymentSuccess: { bookingId: string };
  CheckIn: { bookingId: string };
  ChatDetail: { id: string };
  AddPetModal: undefined;
  HostOnboarding: undefined;
  TrustAndSafety: undefined;
  InsuranceClaim: undefined;
  HostDashboard: undefined;
};
```

> Note: If the Stripe payments plan was implemented first, `PaymentSuccess` is already here. Keep it.

- [ ] **Step 2: Commit**

```bash
git add apapacha-mobile/src/types/navigation.ts
git commit -m "feat: add InsuranceClaim route to navigation types"
```

---

### Task 4: Create InsuranceClaimScreen

**Files:**
- Create: `apapacha-mobile/src/screens/InsuranceClaimScreen.tsx`

- [ ] **Step 1: Create the screen**

```typescript
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { submitClaim, type IncidentType } from '../services/claims.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const INCIDENT_OPTIONS: { type: IncidentType; label: string; icon: string }[] = [
  { type: 'escape',          label: 'Escape del gato',        icon: '🚪' },
  { type: 'injury',          label: 'Lesión o herida',         icon: '🩹' },
  { type: 'illness',         label: 'Enfermedad durante servicio', icon: '🏥' },
  { type: 'property_damage', label: 'Daño a propiedad',        icon: '🏠' },
  { type: 'other',           label: 'Otro',                    icon: '📝' },
];

export function InsuranceClaimScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedType, setSelectedType] = useState<IncidentType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = selectedType !== null && description.trim().length >= 20;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitClaim({ incident_type: selectedType!, description: description.trim() });
      Alert.alert(
        'Siniestro Reportado',
        'Recibimos tu reporte. Un agente revisará tu caso en 1-2 días hábiles y te contactará por email.',
        [{ text: 'Entendido', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el reporte');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportar Siniestro</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            En caso de emergencia veterinaria, llama directamente a tu clínica. Este formulario es para reportes post-incidente.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Tipo de Incidente</Text>
        {INCIDENT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.type}
            style={[styles.optionBtn, selectedType === opt.type && styles.optionBtnSelected]}
            onPress={() => setSelectedType(opt.type)}
            activeOpacity={0.8}
          >
            <Text style={styles.optionIcon}>{opt.icon}</Text>
            <Text style={[styles.optionLabel, selectedType === opt.type && styles.optionLabelSelected]}>
              {opt.label}
            </Text>
            {selectedType === opt.type && <Text style={styles.optionCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Descripción del Incidente</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe qué ocurrió, cuándo, y en qué circunstancias. Mínimo 20 caracteres."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length} caracteres (mínimo 20)</Text>

        <View style={styles.legalNote}>
          <Text style={styles.legalNoteText}>
            Al enviar este reporte confirmas que la información es verídica y que el incidente ocurrió durante un servicio activo en ApapachaPet. Reportes falsos pueden resultar en la suspensión de tu cuenta.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!canSubmit || submitting}
        >
          {submitting
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.submitBtnText}>Enviar Reporte de Siniestro</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  content: { padding: 20, paddingBottom: 100 },
  warningBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FCD34D', marginBottom: 24, gap: 10 },
  warningIcon: { fontSize: 20 },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18, fontWeight: '500' },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: 12, marginTop: 8 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8, gap: 12 },
  optionBtnSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  optionIcon: { fontSize: 22 },
  optionLabel: { flex: 1, fontSize: 15, color: colors.textMain, fontWeight: '500' },
  optionLabelSelected: { color: colors.primary, fontWeight: '700' },
  optionCheck: { fontSize: 18, color: colors.primary },
  descriptionInput: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, fontSize: 14, color: colors.textMain, minHeight: 120, marginBottom: 6 },
  charCount: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginBottom: 16 },
  legalNote: { backgroundColor: `${colors.primary}08`, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: `${colors.primary}20` },
  legalNoteText: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
```

- [ ] **Step 2: Register InsuranceClaim in App.tsx**

In `apapacha-mobile/App.tsx`, add the import:

```typescript
import { InsuranceClaimScreen } from './src/screens/InsuranceClaimScreen';
```

Inside the authenticated `Stack.Navigator`, after the `TrustAndSafety` screen:

```typescript
<Stack.Screen name="InsuranceClaim" component={InsuranceClaimScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
```

- [ ] **Step 3: Commit**

```bash
git add apapacha-mobile/src/screens/InsuranceClaimScreen.tsx apapacha-mobile/App.tsx
git commit -m "feat: add InsuranceClaimScreen with incident form"
```

---

### Task 5: Update TrustAndSafetyScreen with accordion + claim CTA

**Files:**
- Modify: `apapacha-mobile/src/screens/TrustAndSafetyScreen.tsx`

- [ ] **Step 1: Replace TrustAndSafetyScreen.tsx**

```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface PolicySection {
  id: string;
  title: string;
  icon: string;
  body: string;
}

const POLICIES: PolicySection[] = [
  {
    id: '1',
    title: '1. Protocolo Zero Trust Veterinario',
    icon: '🔬',
    body: 'ApapachaPet asume que toda mascota presenta riesgos potenciales si no se declara lo contrario. La ocultación deliberada de condiciones crónicas, alergias o tendencias agresivas exime automáticamente al Cuidador y a Apapacha SpA de toda responsabilidad legal o financiera en caso de incidente.\n\n' +
      'El dueño debe completar el perfil veterinario del gato antes de confirmar cualquier reserva. Los datos médicos se tratan con estricta confidencialidad.',
  },
  {
    id: '2',
    title: '2. Malla de Seguro y Siniestros',
    icon: '🛡️',
    body: 'El cargo de seguro obligatorio cobrado en el Checkout cubre gastos de emergencia clínica hasta $1.500.000 CLP, exclusivamente si el incidente ocurre dentro de un domicilio con "Mallas Anti-Escape" validadas por la plataforma.\n\n' +
      'Para reportar un siniestro, utiliza el botón "Reportar Siniestro" más abajo. Los reportes se procesan en 1-2 días hábiles.',
  },
  {
    id: '3',
    title: '3. Verificación de Identidad (KYC) y Pagos',
    icon: '🔒',
    body: 'Todos los usuarios pasan por verificación de identidad antes de acceder al marketplace. Evadir las pasarelas de pago de ApapachaPet anula instantáneamente la póliza de seguro y resulta en la expulsión definitiva.\n\n' +
      'Los pagos se procesan vía Stripe. Tus datos de pago jamás se almacenan en servidores de ApapachaPet.',
  },
  {
    id: '4',
    title: '4. Ley de Tenencia Responsable',
    icon: '⚖️',
    body: 'Al aceptar el servicio, el cliente otorga al Cuidador la potestad para derivar el animal a autoridades locales bajo "abandono" si el dueño excede 72 horas la fecha de término del contrato en estado de incomunicación.\n\n' +
      'Esto se rige por la Ley 21.020 de Chile sobre Tenencia Responsable de Mascotas y Animales de Compañía.',
  },
  {
    id: '5',
    title: '5. Cancelaciones y Reembolsos',
    icon: '🔄',
    body: 'El cargo de seguro Zero Trust ($2.500 CLP) no es reembolsable bajo ninguna circunstancia.\n\n' +
      'La tarifa de servicio ($4.500 CLP) se reembolsa si la cancelación ocurre con más de 48 horas de anticipación al inicio del servicio.\n\n' +
      'El monto del servicio se reembolsa íntegramente si la cancelación es iniciada por el Cuidador.',
  },
  {
    id: '6',
    title: '6. Privacidad y Datos Personales',
    icon: '🔐',
    body: 'ApapachaPet cumple con la Ley 19.628 sobre protección de datos personales de Chile. Tus datos biométricos (KYC) están encriptados y no se comparten con terceros sin consentimiento explícito.\n\n' +
      'Puedes solicitar la eliminación de tu cuenta y datos personales en cualquier momento contactando a privacidad@apapacha.cl.',
  },
];

function AccordionItem({ policy }: { policy: PolicySection }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  return (
    <View style={styles.policyBlock}>
      <TouchableOpacity style={styles.policyHeader} onPress={toggle} activeOpacity={0.7}>
        <Text style={styles.policyIcon}>{policy.icon}</Text>
        <Text style={styles.policyTitle}>{policy.title}</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {expanded && (
        <Text style={styles.policyText}>{policy.body}</Text>
      )}
    </View>
  );
}

export function TrustAndSafetyScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trust & Safety Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🛡️</Text>
          <Text style={styles.heroTitle}>La Póliza ApapachaPet</Text>
          <Text style={styles.heroText}>
            Reglas inflexibles para garantizar el bienestar integral felino. Toca cada sección para ver los detalles.
          </Text>
        </View>

        {POLICIES.map(policy => (
          <AccordionItem key={policy.id} policy={policy} />
        ))}

        <View style={styles.claimSection}>
          <Text style={styles.claimTitle}>¿Ocurrió un incidente?</Text>
          <Text style={styles.claimText}>
            Si hubo un escape, lesión u otro siniestro durante un servicio, repórtalo aquí para iniciar el proceso de seguro.
          </Text>
          <TouchableOpacity
            style={styles.claimBtn}
            onPress={() => navigation.navigate('InsuranceClaim')}
            activeOpacity={0.8}
          >
            <Text style={styles.claimBtnText}>🚨 Reportar Siniestro</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  scrollContainer: { padding: 20, paddingBottom: 60 },
  heroSection: { alignItems: 'center', marginBottom: 24, paddingVertical: 20, backgroundColor: `${colors.primary}10`, borderRadius: 16, borderWidth: 1, borderColor: `${colors.primary}30` },
  heroIcon: { fontSize: 40, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.primaryDark, marginBottom: 8 },
  heroText: { paddingHorizontal: 20, textAlign: 'center', fontSize: 13, color: colors.textMain, lineHeight: 20, fontWeight: '500' },
  policyBlock: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: 'hidden' },
  policyHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  policyIcon: { fontSize: 20 },
  policyTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textMain },
  chevron: { fontSize: 12, color: colors.textMuted },
  policyText: { fontSize: 14, color: colors.textMuted, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 16 },
  claimSection: { marginTop: 16, backgroundColor: `${colors.danger}08`, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: `${colors.danger}30`, alignItems: 'center' },
  claimTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain, marginBottom: 8 },
  claimText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  claimBtn: { backgroundColor: colors.danger, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center' },
  claimBtnText: { color: colors.surface, fontWeight: '800', fontSize: 15 },
});
```

- [ ] **Step 2: Test accordion behavior**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile"
npx expo start --web --clear
```

Navigate to Profile → "Políticas de Seguridad y Seguros".
- Each policy section should expand/collapse when tapped
- "🚨 Reportar Siniestro" button at the bottom should navigate to InsuranceClaimScreen

- [ ] **Step 3: Test claim form**

In InsuranceClaimScreen:
- Select an incident type → button highlights
- Type fewer than 20 characters → "Enviar" button stays disabled
- Type 20+ characters → button activates
- Submit → shows success Alert and navigates back

- [ ] **Step 4: Verify claim in Supabase**

After submitting a test claim, run in Supabase SQL Editor:
```sql
SELECT * FROM insurance_claims ORDER BY submitted_at DESC LIMIT 5;
```
Expected: the submitted claim appears with status `'open'`.

- [ ] **Step 5: Commit**

```bash
git add apapacha-mobile/src/screens/TrustAndSafetyScreen.tsx
git commit -m "feat: TrustAndSafetyScreen accordion + claim CTA"
```

---

### Task 6: Deploy

- [ ] **Step 1: Build and deploy**

```bash
cd "/Users/sebastian/Desktop/APPs/Apapacha Pet/apapacha-mobile"
npx expo export --platform web
cd ..
npx vercel --prod
```

- [ ] **Step 2: Verify on Vercel**

Open `https://apapacha-pet.vercel.app` → Profile → Políticas de Seguridad.
- Accordion sections expand/collapse
- "Reportar Siniestro" opens the form modal
- Form can be submitted successfully

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: deploy policies and insurance claim screens"
```
