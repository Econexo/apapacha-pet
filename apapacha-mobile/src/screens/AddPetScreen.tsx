import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { addPet } from '../services/pets.service';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function AddPetScreen() {
  const navigation = useNavigation<Nav>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medication, setMedication] = useState('');
  const [vetContact, setVetContact] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Nombre requerido', 'Ingresa el nombre de tu mascota.');
      return;
    }
    setSaving(true);
    try {
      await addPet({
        name: name.trim(),
        breed: '',
        age_years: parseInt(age) || 0,
        weight_kg: parseFloat(weight) || 0,
        sterilized: false,
        medical_alerts: [allergies.trim(), medication.trim()].filter(Boolean),
        image_url: photoUri ?? undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar la mascota');
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para añadir una foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar una foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePhotoPress = () => {
    Alert.alert('Foto de la mascota', 'Selecciona una opción', [
      { text: 'Tomar foto', onPress: takePhoto },
      { text: 'Elegir de galería', onPress: pickPhoto },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alta Clínica</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.photoUpload} onPress={handlePhotoPress} activeOpacity={0.8}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <View style={styles.photoEditBadge}>
                <Text style={styles.photoEditText}>✏️ Cambiar</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.photoUploadIcon}>📷</Text>
              <Text style={styles.photoUploadText}>Añadir Fotografía</Text>
              <Text style={styles.photoUploadHint}>Toca para abrir cámara o galería</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Datos Generales</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nombre de la Mascota</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej. Garfield" placeholderTextColor={colors.textMuted} />
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Edad (años)</Text>
            <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Ej. 3" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Peso (kg)</Text>
            <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="4.5" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Anamnesis Crítica (Zero Trust)</Text>
        <View style={styles.warningBox}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabelWarning}>Alergias o Condiciones Crónicas *</Text>
            <TextInput style={[styles.input, styles.inputWarning, styles.inputMultiline]} value={allergies} onChangeText={setAllergies} placeholder="Describe si tiene rinitis, alergia alimentaria, etc. (Obligatorio)" placeholderTextColor={colors.dangerBorder} multiline numberOfLines={3} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabelWarning}>Instrucciones de Medicación (si aplica)</Text>
            <TextInput style={[styles.input, styles.inputWarning, styles.inputMultiline]} value={medication} onChangeText={setMedication} placeholder="Cantidades y horarios exactos..." placeholderTextColor={colors.dangerBorder} multiline numberOfLines={3} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contacto Veterinario de Emergencia</Text>
          <TextInput style={styles.input} value={vetContact} onChangeText={setVetContact} placeholder="+56 9 ..." placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSubmit} activeOpacity={0.8} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitBtnText}>Validar y Registrar Perfil</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 16, color: colors.textMuted },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  formContainer: { padding: 20, paddingBottom: 80 },
  photoUpload: { backgroundColor: colors.background, height: 140, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 24, overflow: 'hidden', position: 'relative' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoEditBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  photoEditText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  photoUploadIcon: { fontSize: 32, marginBottom: 6 },
  photoUploadText: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  photoUploadHint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textMain, marginBottom: 16, marginTop: 8 },
  rowInputs: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  input: { backgroundColor: colors.background, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, fontSize: 15, color: colors.textMain },
  inputMultiline: { height: 90, textAlignVertical: 'top' },
  warningBox: { backgroundColor: colors.dangerBg, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.dangerBorder, marginBottom: 16 },
  inputLabelWarning: { fontSize: 13, fontWeight: '700', color: colors.dangerText, marginBottom: 6 },
  inputWarning: { backgroundColor: colors.surface, borderColor: colors.dangerBorder },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
