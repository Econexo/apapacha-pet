import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { DateRangePicker } from '../components/DateRangePicker';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SearchFilterScreen() {
  const navigation = useNavigation<Nav>();
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [medicalCert, setMedicalCert] = useState(true);
  const [noOtherPets, setNoOtherPets] = useState(false);
  const [certifiedNets, setCertifiedNets] = useState(true);

  const handleClear = () => {
    setDestination('');
    setCheckIn(null);
    setCheckOut(null);
    setMedicalCert(false);
    setNoOtherPets(false);
    setCertifiedNets(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Búsqueda y Filtros</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearBtnText}>Borrar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>¿Dónde vas a dejar a tu mascota?</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.textInput}
            value={destination}
            onChangeText={setDestination}
            placeholder="Ej. Providencia, Santiago"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Text style={styles.sectionTitle}>¿Cuándo?</Text>
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChangeCheckIn={setCheckIn}
          onChangeCheckOut={setCheckOut}
        />

        <View style={styles.divider} />

        <Text style={styles.sectionTitleWarning}>Filtros Médicos y de Seguridad (Zero Trust)</Text>

        <View style={styles.filterRow}>
          <View style={styles.filterTextCol}>
            <Text style={styles.filterName}>Certificación Médica / Vet</Text>
            <Text style={styles.filterDesc}>Solo personal entrenado para medicación.</Text>
          </View>
          <Switch value={medicalCert} onValueChange={setMedicalCert} trackColor={{ true: colors.primary, false: colors.border }} />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterTextCol}>
            <Text style={styles.filterName}>Mallas Certificadas en Ventanas</Text>
            <Text style={styles.filterDesc}>Espacios inspeccionados digitalmente.</Text>
          </View>
          <Switch value={certifiedNets} onValueChange={setCertifiedNets} trackColor={{ true: colors.primary, false: colors.border }} />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterTextCol}>
            <Text style={styles.filterName}>Exclusividad (Sin otras mascotas)</Text>
            <Text style={styles.filterDesc}>Ideal para gatos estresables o reactivos.</Text>
          </View>
          <Switch value={noOtherPets} onValueChange={setNoOtherPets} trackColor={{ true: colors.primary, false: colors.border }} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => {
            const features: string[] = [];
            if (medicalCert) features.push('Sitter Médico');
            if (certifiedNets) features.push('Patio Cerrado');
            if (noOtherPets) features.push('Sin Otros Gatos');
            (navigation as any).navigate('MainTabs', {
              screen: 'Explore',
              params: {
                filterDestination: destination.trim(),
                filterFeatures: features,
              },
            });
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>Buscar resultados</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 18, color: colors.textMain, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  clearBtn: { padding: 8 },
  clearBtnText: { color: colors.textMain, textDecorationLine: 'underline' },
  content: { padding: 20, paddingBottom: 80 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain, marginBottom: 12, marginTop: 12 },
  inputWrap: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  textInput: { fontSize: 16, color: colors.textMain },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
  sectionTitleWarning: { fontSize: 18, fontWeight: '800', color: colors.primaryDark, marginBottom: 16 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterTextCol: { flex: 1, paddingRight: 16 },
  filterName: { fontSize: 15, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  filterDesc: { fontSize: 13, color: colors.textMuted },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
