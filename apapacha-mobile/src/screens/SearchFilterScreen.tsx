import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { colors } from '../theme/colors';

interface SearchFilterScreenProps {
  onBack: () => void;
  onSearch: () => void;
}

export function SearchFilterScreen({ onBack, onSearch }: SearchFilterScreenProps) {
  const [medicalCert, setMedicalCert] = useState(true);
  const [noOtherPets, setNoOtherPets] = useState(false);
  const [certifiedNets, setCertifiedNets] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={onBack}>
          <Text style={styles.closeBtnText}>X</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Búsqueda y Filtros</Text>
        <TouchableOpacity style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Borrar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Destination */}
        <Text style={styles.sectionTitle}>¿Dónde vas a dejar a tu mascota?</Text>
        <View style={styles.inputWrap}>
          <TextInput 
            style={styles.textInput} 
            placeholder="Ej. Providencia, Santiago" 
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Dates Placeholder */}
        <Text style={styles.sectionTitle}>¿Cuándo?</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Llegada</Text>
            <Text style={styles.dateValue}>Añadir fec...</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Salida</Text>
            <Text style={styles.dateValue}>Añadir fec...</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Zero Trust Filters */}
        <Text style={styles.sectionTitleWarning}>Filtros Médicos y de Seguridad (Zero Trust)</Text>

        <View style={styles.filterRow}>
          <View style={styles.filterTextCol}>
            <Text style={styles.filterName}>Certificación Médica / Vet</Text>
            <Text style={styles.filterDesc}>Solo personal entrenado para medicación.</Text>
          </View>
          <Switch 
            value={medicalCert} 
            onValueChange={setMedicalCert} 
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterTextCol}>
            <Text style={styles.filterName}>Mallas Certificadas en Ventanas</Text>
            <Text style={styles.filterDesc}>Espacios inspeccionados digitalmente.</Text>
          </View>
          <Switch 
            value={certifiedNets} 
            onValueChange={setCertifiedNets} 
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterTextCol}>
            <Text style={styles.filterName}>Exclusividad (Sin otras mascotas)</Text>
            <Text style={styles.filterDesc}>Ideal para gatos estresables o reactivos.</Text>
          </View>
          <Switch 
            value={noOtherPets} 
            onValueChange={setNoOtherPets} 
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
         <TouchableOpacity style={styles.submitBtn} onPress={onSearch}>
           <Text style={styles.submitBtnText}>Buscar 125 resultados</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textMain,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnText: {
    color: colors.textMain,
    textDecorationLine: 'underline',
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 12,
    marginTop: 12,
  },
  inputWrap: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
    color: colors.textMain,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 15,
    color: colors.textMain,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  sectionTitleWarning: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  filterName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
  },
  filterDesc: {
    fontSize: 13,
    color: colors.textMuted,
  },
  footer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 16,
  }
});
