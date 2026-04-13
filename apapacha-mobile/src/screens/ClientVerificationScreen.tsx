import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { completeKyc } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ClientVerificationScreen() {
  const navigation = useNavigation<Nav>();
  const { refreshProfile } = useAuth();
  const [agreementSigned, setAgreementSigned] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Protegemos tu entorno</Text>
        <Text style={styles.subtitle}>En ApapachaPet aplicamos un modelo estricto de Zero Trust. Validaremos tu identidad antes de que confíes la de tu mascota.</Text>

        <View style={styles.securityModule}>
          <Text style={styles.moduleTitle}>1. Documento de Identidad (DNI/Pasaporte)</Text>
          <Text style={styles.moduleText}>Escanea el código QR de tu cédula o toma una fotografía nítida del frente y reverso.</Text>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>📸 Escanear Documento</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityModule}>
          <Text style={styles.moduleTitle}>2. Identidad Biométrica Celular</Text>
          <Text style={styles.moduleText}>Compararemos el rostro de tu documento usando el sensor FaceID / Huella encriptado en tu dispositivo.</Text>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>🛡️ Activar Biometría</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.agreementModule}>
          <Text style={styles.agreementTitle}>3. Responsabilidad (Liability)</Text>
          <Text style={styles.agreementText}>Declaro que la información que subiré sobre mis mascotas es médicamente real y acepto que falsificar información anulará la cobertura del Seguro Veterinario durante cualquier incidente.</Text>
          <TouchableOpacity
            style={[styles.checkboxRow, agreementSigned && styles.checkboxRowActive]}
            onPress={() => setAgreementSigned(!agreementSigned)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreementSigned && styles.checkboxChecked]}>
              {agreementSigned && <Text style={styles.checkIcon}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>Acepto la Declaración Jurada</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, !agreementSigned && styles.submitBtnDisabled]}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Text style={[styles.submitBtnText, !agreementSigned && styles.submitBtnTextDisabled]}>
            Validar Identidad y Explorar
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  scroll: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 32, fontWeight: '800', color: colors.textMain, marginBottom: 12, lineHeight: 36, letterSpacing: -1 },
  subtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 22, opacity: 0.9, marginBottom: 32 },
  securityModule: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  moduleTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain, marginBottom: 8 },
  moduleText: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
  actionBtn: { backgroundColor: `${colors.primary}15`, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
  agreementModule: { backgroundColor: colors.successBg, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.successBorder, marginBottom: 16, marginTop: 8 },
  agreementTitle: { fontSize: 16, fontWeight: '800', color: colors.successText, marginBottom: 8 },
  agreementText: { fontSize: 13, color: colors.successTextDark, lineHeight: 18, marginBottom: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.successBorder },
  checkboxRowActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}05` },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkIcon: { color: colors.surface, fontSize: 14, fontWeight: '900' },
  checkboxText: { fontSize: 15, fontWeight: '700', color: colors.textMain },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  submitBtnDisabled: { backgroundColor: colors.border, elevation: 0 },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
  submitBtnTextDisabled: { color: colors.textMuted },
});
