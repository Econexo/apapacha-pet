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
    body: 'ApapachaPet asume que toda mascota presenta riesgos potenciales si no se declara lo contrario. La ocultación deliberada de condiciones crónicas, alergias o tendencias agresivas exime automáticamente al Cuidador y a Apapacha SpA de toda responsabilidad legal o financiera en caso de incidente.\n\nEl dueño debe completar el perfil veterinario del gato antes de confirmar cualquier reserva. Los datos médicos se tratan con estricta confidencialidad.',
  },
  {
    id: '2',
    title: '2. Malla de Seguro y Siniestros',
    icon: '🛡️',
    body: 'El cargo de seguro obligatorio cobrado en el Checkout cubre gastos de emergencia clínica hasta $1.500.000 CLP, exclusivamente si el incidente ocurre dentro de un domicilio con "Mallas Anti-Escape" validadas por la plataforma.\n\nPara reportar un siniestro, utiliza el botón "Reportar Siniestro" más abajo. Los reportes se procesan en 1-2 días hábiles.',
  },
  {
    id: '3',
    title: '3. Verificación de Identidad (KYC) y Pagos',
    icon: '🔒',
    body: 'Todos los usuarios pasan por verificación de identidad antes de acceder al marketplace. Evadir las pasarelas de pago de ApapachaPet anula instantáneamente la póliza de seguro y resulta en la expulsión definitiva.\n\nLos pagos se procesan vía Stripe. Tus datos de pago jamás se almacenan en servidores de ApapachaPet.',
  },
  {
    id: '4',
    title: '4. Ley de Tenencia Responsable',
    icon: '⚖️',
    body: 'Al aceptar el servicio, el cliente otorga al Cuidador la potestad para derivar el animal a autoridades locales bajo "abandono" si el dueño excede 72 horas la fecha de término del contrato en estado de incomunicación.\n\nEsto se rige por la Ley 21.020 de Chile sobre Tenencia Responsable de Mascotas y Animales de Compañía.',
  },
  {
    id: '5',
    title: '5. Cancelaciones y Reembolsos',
    icon: '🔄',
    body: 'El cargo de seguro Zero Trust ($2.500 CLP) no es reembolsable bajo ninguna circunstancia.\n\nLa tarifa de servicio ($4.500 CLP) se reembolsa si la cancelación ocurre con más de 48 horas de anticipación al inicio del servicio.\n\nEl monto del servicio se reembolsa íntegramente si la cancelación es iniciada por el Cuidador.',
  },
  {
    id: '6',
    title: '6. Privacidad y Datos Personales',
    icon: '🔐',
    body: 'ApapachaPet cumple con la Ley 19.628 sobre protección de datos personales de Chile. Tus datos biométricos (KYC) están encriptados y no se comparten con terceros sin consentimiento explícito.\n\nPuedes solicitar la eliminación de tu cuenta y datos personales en cualquier momento contactando a privacidad@apapacha.cl.',
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
  claimSection: { marginTop: 16, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#FECACA', alignItems: 'center' },
  claimTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain, marginBottom: 8 },
  claimText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  claimBtn: { backgroundColor: '#EF4444', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center' },
  claimBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
