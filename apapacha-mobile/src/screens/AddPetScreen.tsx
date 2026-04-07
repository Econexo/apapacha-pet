import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '../theme/colors';

interface AddPetScreenProps {
  onBack: () => void;
  onSave: () => void;
}

export function AddPetScreen({ onBack, onSave }: AddPetScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alta Clínica</Text>
        <View style={{width: 60}} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
        
        {/* Placeholder Foto */}
        <View style={styles.photoUpload}>
          <Text style={styles.photoUploadIcon}>📷</Text>
          <Text style={styles.photoUploadText}>Añadir Fotografía</Text>
        </View>

        {/* Basic Info */}
        <Text style={styles.sectionTitle}>Datos Generales</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nombre de la Mascota</Text>
          <View style={styles.inputWrap}><Text style={styles.placeholder}>Ej. Garfield</Text></View>
        </View>
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Edad</Text>
            <View style={styles.inputWrap}><Text style={styles.placeholder}>Ej. 3</Text></View>
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Peso (kg)</Text>
            <View style={styles.inputWrap}><Text style={styles.placeholder}>4.5</Text></View>
          </View>
        </View>

        {/* Clinical Info */}
        <Text style={styles.sectionTitle}>Anamnesis Crítica (Zero Trust)</Text>
        
        <View style={styles.warningBox}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabelWarning}>Alergias o Condiciones Crónicas *</Text>
            <View style={styles.inputWrapWarning}>
              <Text style={styles.placeholderWarning}>Describe si tiene rinitis, alergia alimentaria, etc. (Obligatorio)</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabelWarning}>Instrucciones de Medicación (si aplica)</Text>
            <View style={styles.inputWrapWarning}>
              <Text style={styles.placeholderWarning}>Cantidades y horarios exactos...</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contacto Veterinario de Emergencia</Text>
          <View style={styles.inputWrap}><Text style={styles.placeholder}>+56 9 ...</Text></View>
        </View>

      </ScrollView>

      {/* Button fixed bottom */}
      <View style={styles.footer}>
         <TouchableOpacity style={styles.submitBtn} onPress={onSave}>
           <Text style={styles.submitBtnText}>Validar y Registrar Perfil</Text>
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
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  photoUpload: {
    backgroundColor: colors.background,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  photoUploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoUploadText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 16,
    marginTop: 8,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  inputWrap: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholder: {
    color: colors.textMuted,
    opacity: 0.5,
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 16,
  },
  inputLabelWarning: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 6,
  },
  inputWrapWarning: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  placeholderWarning: {
    color: '#EF4444',
    opacity: 0.7,
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
