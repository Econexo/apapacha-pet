import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

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
          <Text style={styles.heroText}>Reglas inflexibles establecidas para garantizar el bienestar integral felino y eximir a la plataforma de responsabilidades no declaradas.</Text>
        </View>

        <View style={styles.policyBlock}>
          <Text style={styles.policyTitle}>1. Protocolo Zero Trust Veterinario</Text>
          <Text style={styles.policyText}>
            ApapachaPet asume que toda mascota presenta riesgos potenciales si no se declara lo contrario. La ocultación deliberada de condiciones crónicas, alergias o tendencias agresivas exime automáticamente al Cuidador y a Apapacha SpA de toda responsabilidad legal o financiera en caso de incidente.
          </Text>
        </View>

        <View style={styles.policyBlock}>
          <Text style={styles.policyTitle}>2. Malla de Seguro y Siniestros</Text>
          <Text style={styles.policyText}>
            El cargo de seguro obligatorio cobrado en el "Checkout" cubre gastos de emergencia clínica hasta por 1.5M CLP, exclusivamente si el incidente ocurre dentro de un domicilio con "Mallas Anti-Escape" validadas por la plataforma.
          </Text>
        </View>

        <View style={styles.policyBlock}>
          <Text style={styles.policyTitle}>3. Verificación de Identidad (KYC) y Pagos</Text>
          <Text style={styles.policyText}>
            Evadir las pasarelas de pago de ApapachaPet anula instantáneamente la póliza de seguro y resulta en la expulsión definitiva del Dueño y el Cuidador. Tus datos biométricos están encriptados y jamás se comparten.
          </Text>
        </View>

        <View style={styles.policyBlock}>
          <Text style={styles.policyTitle}>4. Ley de Tenencia Responsable y Abandono</Text>
          <Text style={styles.policyText}>
            Al aceptar la prestación de servicio, el cliente otorga al Cuidador la potestad para derivar el animal a autoridades locales bajo 'abandono' si el dueño excede 72 horas la fecha de término del contrato en estado de incomunicación.
          </Text>
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
  heroSection: { alignItems: 'center', marginBottom: 32, paddingVertical: 16, backgroundColor: `${colors.primary}10`, borderRadius: 16, borderWidth: 1, borderColor: `${colors.primary}30` },
  heroIcon: { fontSize: 40, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.primaryDark, marginBottom: 8 },
  heroText: { paddingHorizontal: 20, textAlign: 'center', fontSize: 13, color: colors.textMain, lineHeight: 20, fontWeight: '500' },
  policyBlock: { backgroundColor: colors.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  policyTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain, marginBottom: 12 },
  policyText: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
});
