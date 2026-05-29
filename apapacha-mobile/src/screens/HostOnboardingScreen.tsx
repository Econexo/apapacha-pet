import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import { useToast } from '../components/Toast';
import type { RootStackParamList } from '../types/navigation';
import { applyAsHost } from '../services/auth.service';
import { supabase } from '../../supabase';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HostOnboardingScreen({ onClose }: { onClose?: () => void } = {}) {
  const navigation = useNavigation<Nav>();
  const close = () => onClose ? onClose() : navigation.goBack();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'Alojamiento' | 'Visita'>('Alojamiento');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  type FileEntry = { uri: string; name: string; blob?: Blob };

  const [dniPhoto, setDniPhoto]         = useState<FileEntry | null>(null);
  const [selfiePhoto, setSelfiePhoto]   = useState<FileEntry | null>(null);
  const [mallaPhoto, setMallaPhoto]     = useState<FileEntry | null>(null);
  const [rasPhoto, setRasPhoto]         = useState<FileEntry | null>(null);
  const [antecedentes, setAntecedentes] = useState<FileEntry | null>(null);
  const [certVet, setCertVet]           = useState<FileEntry | null>(null);

  // On web, blob: URIs from the picker can be revoked by the time we submit.
  // We fetch and cache the blob immediately at pick time, with an AbortController timeout.
  const captureBlob = async (uri: string): Promise<Blob | undefined> => {
    if (Platform.OS !== 'web') return undefined;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(uri, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return undefined;
      return await res.blob();
    } catch {
      return undefined;
    }
  };

  const pickPhoto = async (setter: (v: FileEntry) => void, preferCamera = false) => {
    const doLibrary = async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { toast.warning('Permiso requerido', 'Necesitamos acceso a tus fotos.'); return; }
      }
      const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] as ImagePicker.MediaType[] });
      if (!r.canceled && r.assets[0]) {
        const asset = r.assets[0];
        const name = asset.fileName ?? `foto_${Date.now()}.jpg`;
        const blob = await captureBlob(asset.uri);
        setter({ uri: asset.uri, name, blob });
      }
    };
    const doCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { toast.warning('Permiso requerido', 'Necesitamos acceso a la cámara.'); return; }
      const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!r.canceled && r.assets[0]) {
        const asset = r.assets[0];
        const name = asset.fileName ?? `foto_${Date.now()}.jpg`;
        const blob = await captureBlob(asset.uri);
        setter({ uri: asset.uri, name, blob });
      }
    };
    if (Platform.OS === 'web') { await doLibrary(); }
    else if (preferCamera) {
      Alert.alert('Subir foto', 'Elige la fuente', [
        { text: 'Cámara', onPress: doCamera },
        { text: 'Galería', onPress: doLibrary },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } else { await doLibrary(); }
  };

  const pickDoc = async (setter: (v: FileEntry) => void) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const blob = await captureBlob(asset.uri);
      setter({ uri: asset.uri, name: asset.name, blob });
    }
  };

  const MIME_BY_EXT: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', heic: 'image/heic', pdf: 'application/pdf',
  };

  const uploadFile = async (file: FileEntry, folder: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    let blob: Blob;
    if (file.blob) {
      // Pre-fetched at pick time — always use this on web
      blob = file.blob;
    } else if (Platform.OS === 'web') {
      // On web the blob must have been captured at pick time.
      // If it's missing the URI has already expired — don't hang trying to re-fetch it.
      throw new Error(`El archivo "${folder}" ya no está disponible. Selecciónalo de nuevo e intenta enviar.`);
    } else {
      // Native: local file URI is always valid
      const response = await fetch(file.uri);
      if (!response.ok) throw new Error(`No se pudo leer el archivo (${response.status})`);
      blob = await response.blob();
    }

    const rawExt = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const ext = rawExt || 'jpg';
    const mimeType = (blob.type && blob.type !== 'application/octet-stream' && blob.type !== '')
      ? blob.type
      : (MIME_BY_EXT[ext] ?? 'image/jpeg');

    const safeName = `${folder}-${Date.now()}.${ext}`;
    const path = `${user.id}/kyc/${safeName}`;

    // 30-second timeout so the button never hangs forever
    const uploadResult = await Promise.race([
      supabase.storage.from('kyc-docs').upload(path, blob, { contentType: mimeType, upsert: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo agotado al subir el archivo. Verifica tu conexión.')), 30000)
      ),
    ]);

    if (uploadResult.error) throw new Error(`Error subiendo ${folder}: ${uploadResult.error.message}`);
    return supabase.storage.from('kyc-docs').getPublicUrl(path).data.publicUrl;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!dniPhoto || !selfiePhoto) {
        toast.warning('Documentos requeridos', 'Debes subir tu cédula de identidad y el selfie biométrico.');
        return;
      }
      setStep(2); return;
    }
    if (step === 2) { setStep(3); return; }

    // Step 3 — validate & submit
    const isSpace = role === 'Alojamiento';
    if (isSpace && (!mallaPhoto || !rasPhoto)) {
      toast.warning('Evidencia requerida', 'Debes subir las fotos de malla y rascador.');
      return;
    }
    if (!isSpace && !antecedentes) {
      toast.warning('Documento requerido', 'Debes subir el certificado de antecedentes.');
      return;
    }

    setSubmitting(true);
    try {
      // Check for existing pending/approved application before uploading
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from('host_applications')
          .select('id, status')
          .eq('applicant_id', user.id)
          .in('status', ['pending', 'approved'])
          .maybeSingle();
        if (existing) {
          toast.warning(
            existing.status === 'approved' ? 'Ya eres cuidador' : 'Solicitud en revisión',
            existing.status === 'approved'
              ? 'Tu postulación ya fue aprobada.'
              : 'Ya tienes una solicitud pendiente de revisión. Te notificaremos pronto.',
          );
          setSubmitting(false);
          return;
        }
      }

      const [dniUrl, selfieUrl] = await Promise.all([
        uploadFile(dniPhoto!, 'dni'),
        uploadFile(selfiePhoto!, 'selfie'),
      ]);
      let evidenceUrl1: string | undefined;
      let evidenceUrl2: string | undefined;
      if (isSpace) {
        [evidenceUrl1, evidenceUrl2] = await Promise.all([
          uploadFile(mallaPhoto!, 'malla'),
          uploadFile(rasPhoto!, 'rascador'),
        ]);
      } else {
        evidenceUrl1 = await uploadFile(antecedentes!, 'antecedentes');
        if (certVet) evidenceUrl2 = await uploadFile(certVet, 'cert-vet');
      }
      await applyAsHost({
        service_type: isSpace ? 'space' : 'visiter',
        kyc_doc_url: dniUrl,
        selfie_url: selfieUrl,
        evidence_url_1: evidenceUrl1,
        evidence_url_2: evidenceUrl2,
      });
      toast.success('¡Solicitud enviada!', 'Revisaremos tu solicitud y te notificaremos en 24-48 horas.');
      close();
    } catch (e: any) {
      toast.error('Error', e.message ?? 'No se pudo enviar la solicitud');
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
            <Text style={styles.uploadDoneText}>✅ {dniPhoto?.name}</Text>
            <TouchableOpacity onPress={() => setDniPhoto(null)}><Text style={styles.uploadRetry}>Cambiar</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={() => pickPhoto(setDniPhoto, true)} activeOpacity={0.8}>
            <Text style={styles.uploadText}>📸 {Platform.OS === 'web' ? 'Subir Documento' : 'Tomar Foto del Documento'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.uploadBlock}>
        <Text style={styles.uploadLabel}>Selfie Biométrico</Text>
        {selfiePhoto ? (
          <View style={styles.uploadDone}>
            <Text style={styles.uploadDoneText}>✅ {selfiePhoto?.name}</Text>
            <TouchableOpacity onPress={() => setSelfiePhoto(null)}><Text style={styles.uploadRetry}>Cambiar</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={() => pickPhoto(setSelfiePhoto, true)} activeOpacity={0.8}>
            <Text style={styles.uploadText}>🤳 {Platform.OS === 'web' ? 'Subir Selfie' : 'Tomar Selfie'}</Text>
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
                <Text style={styles.uploadDoneText}>✅ {mallaPhoto?.name}</Text>
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
                <Text style={styles.uploadDoneText}>✅ {rasPhoto?.name}</Text>
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
                <Text style={styles.uploadDoneText}>✅ {antecedentes?.name}</Text>
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
                <Text style={styles.uploadDoneText}>✅ {certVet?.name}</Text>
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
        <TouchableOpacity style={styles.closeBtn} onPress={close}>
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
