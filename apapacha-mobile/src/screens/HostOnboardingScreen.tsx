import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { applyAsHost } from '../services/auth.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HostOnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'Alojamiento' | 'Visita'>('Alojamiento');
  const [submitting, setSubmitting] = useState(false);

  // Upload states: label when file picked, null otherwise
  const [dniPhoto, setDniPhoto]         = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto]   = useState<string | null>(null);
  const [mallaPhoto, setMallaPhoto]     = useState<string | null>(null);
  const [rasPhoto, setRasPhoto]         = useState<string | null>(null);
  const [antecedentes, setAntecedentes] = useState<string | null>(null);
  const [certVet, setCertVet]           = useState<string | null>(null);

  const pickPhoto = async (setter: (v: string) => void, useCamera = false) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso para continuar.');
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].fileName ?? 'foto.jpg');
    }
  };

  const pickDoc = async (setter: (v: string) => void) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].name);
    }
  };

  const handleNext = async () => {
    if (step < 3) { setStep(step + 1); return; }
    setSubmitting(true);
    try {
      await applyAsHost({ service_type: role === 'Alojamiento' ? 'space' : 'visiter' });
      Alert.alert('¡Solicitud enviada!', 'Revisaremos tu solicitud y te notificaremos en 24-48 horas.', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.title}>Paso 1: Identidad Legal (KYC)</Text>
      <Text style={styles.description}>Por seguridad de nuestra comunidad felina, debemos conocer tu identidad verificada por gobierno antes de procesar pagos.</Text>
      <View style={styles.uploadBlock}>
        <Text style={styles.uploadLabel}>Cédula de Identidad o DNI Frontal</Text>
        {dniPhoto ? (
          <View style={styles.uploadDone}>
            <Text style={styles.uploadDoneText}>✅ {dniPhoto}</Text>
            <TouchableOpacity onPress={() => setDniPhoto(null)}><Text style={styles.uploadRetry}>Cambiar</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={() => pickPhoto(setDniPhoto, true)} activeOpacity={0.8}>
            <Text style={styles.uploadText}>📸 Tomar Foto del Documento</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.uploadBlock}>
        <Text style={styles.uploadLabel}>Selfie Biométrico</Text>
        {selfiePhoto ? (
          <View style={styles.uploadDone}>
            <Text style={styles.uploadDoneText}>✅ {selfiePhoto}</Text>
            <TouchableOpacity onPress={() => setSelfiePhoto(null)}><Text style={styles.uploadRetry}>Cambiar</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={() => pickPhoto(setSelfiePhoto, true)} activeOpacity={0.8}>
            <Text style={styles.uploadText}>🤳 Tomar Selfie</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.title}>Paso 2: ¿Qué tipo de servicio ofreces?</Text>
      <Text style={styles.description}>ApapachaPet separa de forma estricta los servicios de Alojamiento (en tu hogar) y las Visitas Domiciliarias (en casa del dueño).</Text>
      <View style={styles.roleSelection}>
        <TouchableOpacity style={[styles.roleCard, role === 'Alojamiento' && styles.roleCardActive]} onPress={() => setRole('Alojamiento')}>
          <Text style={[styles.roleTitle, role === 'Alojamiento' && styles.roleTitleActive]}>Hospedaje Catificado</Text>
          <Text style={styles.roleDesc}>Alojar gatos temporalmente en tu propio hogar condicionado.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.roleCard, role === 'Visita' && styles.roleCardActive]} onPress={() => setRole('Visita')}>
          <Text style={[styles.roleTitle, role === 'Visita' && styles.roleTitleActive]}>Visita Veterinaria Básica</Text>
          <Text style={styles.roleDesc}>Ir a la casa del gato a alimentarlo, medicarlo y jugar.</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Zero Trust Assurance</Text>
        <Text style={styles.warningText}>Si eliges Hospedaje, exigiremos certificados de malla. Si eliges Visitas, exigiremos antecedentes penales y entrevista de evaluación.</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.title}>Paso 3: Evidencia de Cuidado Seguro</Text>
      {role === 'Alojamiento' ? (
        <>
          <Text style={styles.description}>Necesitamos visualizar las mallas anti-escape instaladas en tu hogar actual.</Text>
          <View style={styles.uploadBlock}>
            <Text style={styles.uploadLabel}>Fotografía Balcón/Ventana Mapeada</Text>
            {mallaPhoto ? (
              <View style={styles.uploadDone}>
                <Text style={styles.uploadDoneText}>✅ {mallaPhoto}</Text>
                <TouchableOpacity onPress={() => setMallaPhoto(null)}><Text style={styles.uploadRetry}>Cambiar</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={() => pickPhoto(setMallaPhoto)} activeOpacity={0.8}>
                <Text style={styles.uploadText}>📸 Subir Foto de Malla</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.uploadBlock}>
            <Text style={styles.uploadLabel}>Foto de Rascador de Suelo a Techo</Text>
            {rasPhoto ? (
              <View style={styles.uploadDone}>
                <Text style={styles.uploadDoneText}>✅ {rasPhoto}</Text>
                <TouchableOpacity onPress={() => setRasPhoto(null)}><Text style={styles.uploadRetry}>Cambiar</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={() => pickPhoto(setRasPhoto)} activeOpacity={0.8}>
                <Text style={styles.uploadText}>📸 Subir Foto de Enriquecimiento</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.description}>Necesitamos tus antecedentes civiles limpios y certificación veterinaria si la tienes.</Text>
          <View style={styles.uploadBlock}>
            <Text style={styles.uploadLabel}>Antecedentes Civiles (últimos 30 días)</Text>
            {antecedentes ? (
              <View style={styles.uploadDone}>
                <Text style={styles.uploadDoneText}>✅ {antecedentes}</Text>
                <TouchableOpacity onPress={() => setAntecedentes(null)}><Text style={styles.uploadRetry}>Cambiar</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={() => pickDoc(setAntecedentes)} activeOpacity={0.8}>
                <Text style={styles.uploadText}>📄 Subir PDF Certificado Oficial</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.uploadBlock}>
            <Text style={styles.uploadLabel}>Certificado Veterinario (opcional)</Text>
            {certVet ? (
              <View style={styles.uploadDone}>
                <Text style={styles.uploadDoneText}>✅ {certVet}</Text>
                <TouchableOpacity onPress={() => setCertVet(null)}><Text style={styles.uploadRetry}>Cambiar</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={() => pickDoc(setCertVet)} activeOpacity={0.8}>
                <Text style={styles.uploadText}>📄 Subir Diploma o Registro</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );

  const progressPercent = (step / 3) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕ Cancelar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>Paso {step} de 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.nextBtn, submitting && { opacity: 0.7 }]} onPress={handleNext} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.nextBtnText}>{step === 3 ? 'Enviar Solicitud a Evaluación Central' : 'Continuar'}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { paddingVertical: 4, alignSelf: 'flex-start' },
  closeBtnText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  progressWrapper: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'right' },
  scroll: { padding: 24, paddingBottom: 100 },
  stepContent: { marginTop: 10 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textMain, marginBottom: 12 },
  description: { fontSize: 15, color: colors.textMuted, lineHeight: 22, marginBottom: 24 },
  uploadBlock: { marginBottom: 24 },
  uploadLabel: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 8 },
  uploadBox: { height: 100, backgroundColor: colors.background, borderRadius: 12, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  uploadText: { color: colors.primaryDark, fontWeight: '700' },
  uploadDone: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.successBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.successBorder },
  uploadDoneText: { fontSize: 13, color: colors.successText, fontWeight: '700', flex: 1 },
  uploadRetry: { fontSize: 13, color: colors.primary, fontWeight: '700', marginLeft: 8 },
  roleSelection: { gap: 16, marginBottom: 24 },
  roleCard: { padding: 16, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background },
  roleCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  roleTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  roleTitleActive: { color: colors.primaryDark },
  roleDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  warningBox: { backgroundColor: colors.dangerBg, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.dangerBorder },
  warningTitle: { color: colors.dangerText, fontWeight: '800', marginBottom: 4 },
  warningText: { color: colors.dangerTextDark, fontSize: 13, lineHeight: 18 },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  nextBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  nextBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
