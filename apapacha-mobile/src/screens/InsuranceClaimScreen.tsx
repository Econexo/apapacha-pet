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
