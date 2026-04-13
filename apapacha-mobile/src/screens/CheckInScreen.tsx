import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { ChecklistRow } from '../components/ChecklistRow';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CHECKLIST = [
  { id: '1', label: 'Verificación de Identidad Fotográfica — El cuidador coincide con el perfil.' },
  { id: '2', label: 'Entrega de Seguro (Transportadora) — Gato entregado en caja asegurada.' },
  { id: '3', label: 'Revisión Mallas Anti-Escape — Balcón y ventanas reforzados.' },
  { id: '4', label: 'Confirmación Dieta Cero-Pollo — Cuidador entiende la alergia estricta.' },
];

export function CheckInScreen() {
  const navigation = useNavigation<Nav>();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const handleToggle = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allChecked = CHECKLIST.every(item => checkedItems[item.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Protocolo de Ingreso</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Acción Irreversible</Text>
          <Text style={styles.warningText}>
            Al iniciar el Check-In, transfieres la custodia temporal bajo la póliza Zero Trust.
            Ambas partes deben estar presentes.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Checklist Obligatorio</Text>
        {CHECKLIST.map(item => (
          <ChecklistRow
            key={item.id}
            label={item.label}
            checked={!!checkedItems[item.id]}
            onToggle={() => handleToggle(item.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, !allChecked && styles.confirmBtnDisabled]}
          disabled={!allChecked}
          onPress={() => navigation.navigate('MainTabs')}
          activeOpacity={0.8}
        >
          <Text style={[styles.confirmBtnText, !allChecked && styles.confirmBtnTextDisabled]}>
            {allChecked ? 'Deslizar para Iniciar Estadía →' : 'Completa el Checklist'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { paddingVertical: 8 },
  backBtnText: { color: colors.textMuted, fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  scrollContainer: { padding: 20 },
  warningCard: { backgroundColor: colors.dangerBg, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.dangerBorder, marginBottom: 24 },
  warningTitle: { fontSize: 16, fontWeight: '800', color: colors.dangerText, marginBottom: 8 },
  warningText: { fontSize: 14, color: colors.dangerTextDark, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain, marginBottom: 16 },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  confirmBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: colors.border },
  confirmBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
  confirmBtnTextDisabled: { color: colors.textMuted },
});
