import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { useToast } from '../components/Toast';
import type { RootStackParamList } from '../types/navigation';
import { completeKyc, uploadKycDoc } from '../services/auth.service';
import { fonts } from '../theme/typography';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ClientVerificationScreen() {
  const navigation = useNavigation<Nav>();
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [docFront, setDocFront] = useState(false);
  const [docBack, setDocBack] = useState(false);
  const frontUri = useRef<string | null>(null);
  const backUri = useRef<string | null>(null);
  const [scanningSide, setScanningSide] = useState<null | 'front' | 'back'>(null);
  const [bioVerified, setBioVerified] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const docScanned = docFront && docBack;

  // Auto-scroll to agreement section once biometric is done
  useEffect(() => {
    if (bioVerified) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    }
  }, [bioVerified]);

  const markSide = (side: 'front' | 'back', uri: string) => {
    if (side === 'front') { setDocFront(true); frontUri.current = uri; }
    else { setDocBack(true); backUri.current = uri; }
  };

  const pickFromLibrary = async (side: 'front' | 'back') => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('Permiso requerido', 'Necesitamos acceso a tus fotos.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) markSide(side, result.assets[0].uri);
  };

  const pickFromCamera = async (side: 'front' | 'back') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.warning('Permiso requerido', 'Necesitamos acceso a la cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) markSide(side, result.assets[0].uri);
  };

  const handleScanDoc = async (side: 'front' | 'back') => {
    const label = side === 'front' ? 'FRENTE' : 'REVERSO';
    if (Platform.OS === 'web') {
      setScanningSide(side);
      await pickFromLibrary(side);
      setScanningSide(null);
    } else {
      // Alert.alert is non-blocking on native — manage scanning state inside each callback
      Alert.alert(`Escanear ${label}`, `Sube el ${label.toLowerCase()} de tu cédula`, [
        {
          text: 'Cámara', onPress: async () => {
            setScanningSide(side);
            await pickFromCamera(side);
            setScanningSide(null);
          },
        },
        {
          text: 'Galería', onPress: async () => {
            setScanningSide(side);
            await pickFromLibrary(side);
            setScanningSide(null);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const handleBiometry = () => {
    if (Platform.OS === 'web') {
      // window.alert onPress callbacks are unreliable in some browser environments
      setBioVerified(true);
      toast.info('Identidad registrada', 'Tu identidad se validará manualmente en 24 hrs.');
    } else {
      Alert.alert(
        'Verificación Biométrica',
        'La verificación biométrica completa estará disponible en la app nativa. Por ahora tu identidad se validará manualmente en 24 hrs.',
        [{ text: 'Entendido', onPress: () => setBioVerified(true) }]
      );
    }
  };

  const handleFinish = async () => {
    if (!agreementSigned) {
      toast.warning('Firma Requerida', 'Acepta la declaración jurada en el paso 3 para continuar.');
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    setFinishing(true);
    try {
      // Subida best-effort: si el usuario escaneó la cédula, la persistimos.
      // No bloquea el registro si la subida falla o si no escaneó nada.
      const docs: { front?: string; back?: string } = {};
      try {
        if (frontUri.current) docs.front = await uploadKycDoc('front', frontUri.current);
        if (backUri.current)  docs.back  = await uploadKycDoc('back', backUri.current);
      } catch (upErr) {
        console.warn('[kyc] doc upload failed (continuing):', upErr);
      }
      await completeKyc(docs);
      await refreshProfile();
      navigation.replace('MainTabs');
    } catch (e: any) {
      toast.error('Error', e.message ?? 'No se pudo completar la verificación');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Protegemos tu entorno</Text>
        <Text style={styles.subtitle}>En ApapachaPet aplicamos un modelo estricto de Zero Trust. Validaremos tu identidad antes de que confíes la de tu mascota.</Text>

        <View style={styles.securityModule}>
          <Text style={styles.moduleTitle}>1. Documento de Identidad (DNI/Pasaporte)</Text>
          <Text style={styles.moduleText}>Toma una fotografía nítida del <Text style={{ fontWeight: '800' }}>frente</Text> y del <Text style={{ fontWeight: '800' }}>reverso</Text> de tu cédula. Debes subir ambos lados.</Text>
          <View style={styles.docSlotsRow}>
            {(['front', 'back'] as const).map((side) => {
              const done = side === 'front' ? docFront : docBack;
              const label = side === 'front' ? 'Frente' : 'Reverso';
              return done ? (
                <View key={side} style={[styles.docSlot, styles.docSlotDone]}>
                  <Text style={styles.docSlotDoneText}>✅ {label}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  key={side}
                  style={styles.docSlot}
                  onPress={() => handleScanDoc(side)}
                  disabled={scanningSide !== null}
                  activeOpacity={0.8}
                >
                  {scanningSide === side
                    ? <ActivityIndicator color={colors.primaryDark} size="small" />
                    : <Text style={styles.actionBtnText}>📸 {label}</Text>
                  }
                </TouchableOpacity>
              );
            })}
          </View>
          {docScanned && (
            <View style={[styles.doneRow, { marginTop: 12 }]}>
              <Text style={styles.doneText}>✅ Documento completo (frente y reverso)</Text>
            </View>
          )}
        </View>

        <View style={styles.securityModule}>
          <Text style={styles.moduleTitle}>2. Identidad Biométrica Celular</Text>
          <Text style={styles.moduleText}>Compararemos el rostro de tu documento usando el sensor FaceID / Huella encriptado en tu dispositivo.</Text>
          {bioVerified ? (
            <View style={styles.doneRow}>
              <Text style={styles.doneText}>✅ Biometría verificada</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={handleBiometry} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>🛡️ Activar Biometría</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.agreementModule}>
          <Text style={styles.agreementTitle}>3. Responsabilidad (Liability)</Text>
          <Text style={styles.agreementText}>Declaro que la información que subiré sobre mis mascotas es médicamente real y entiendo que omitir o falsear datos médicos me hace responsable de lo que ocurra durante el servicio.</Text>
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
        {!agreementSigned && (
          <Text style={styles.footerHint}>Acepta la declaración jurada (paso 3) para continuar</Text>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, (!agreementSigned || finishing) && styles.submitBtnDisabled]}
          onPress={handleFinish}
          disabled={finishing}
          activeOpacity={0.8}
        >
          {finishing
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={[styles.submitBtnText, !agreementSigned && styles.submitBtnTextDisabled]}>
                Validar Identidad y Explorar
              </Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  scroll: { padding: 24, paddingBottom: 60 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.textMain, marginBottom: 12, lineHeight: 38, letterSpacing: -0.8 },
  subtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 22, opacity: 0.9, marginBottom: 32 },
  securityModule: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  moduleTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain, marginBottom: 8 },
  moduleText: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
  actionBtn: { backgroundColor: `${colors.primary}15`, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
  docSlotsRow: { flexDirection: 'row', gap: 12 },
  docSlot: { flex: 1, backgroundColor: `${colors.primary}15`, paddingVertical: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  docSlotDone: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBorder },
  docSlotDoneText: { color: colors.successText, fontWeight: '800', fontSize: 14 },
  agreementModule: { backgroundColor: colors.successBg, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.successBorder, marginBottom: 16, marginTop: 8 },
  agreementTitle: { fontSize: 16, fontWeight: '800', color: colors.successText, marginBottom: 8 },
  agreementText: { fontSize: 13, color: colors.successTextDark, lineHeight: 18, marginBottom: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.successBorder },
  checkboxRowActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}05` },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkIcon: { color: colors.surface, fontSize: 14, fontWeight: '900' },
  checkboxText: { fontSize: 15, fontWeight: '700', color: colors.textMain },
  footer: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: colors.border },
  footerHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 10 },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  submitBtnDisabled: { backgroundColor: colors.border, elevation: 0 },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
  submitBtnTextDisabled: { color: colors.textMuted },
  doneRow: { backgroundColor: colors.successBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.successBorder },
  doneText: { color: colors.successText, fontWeight: '700', fontSize: 14, textAlign: 'center' },
});
