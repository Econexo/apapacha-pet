import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { addPet, updatePet, getMyPets } from '../services/pets.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AddPetModal'>;

export function AddPetScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const petId = route.params?.petId;
  const isEdit = !!petId;

  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [sterilized, setSterilized] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [medication, setMedication] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingPet, setLoadingPet] = useState(isEdit);

  useEffect(() => {
    if (!petId) return;
    getMyPets().then(pets => {
      const pet = pets.find(p => p.id === petId);
      if (pet) {
        setName(pet.name);
        setBreed(pet.breed ?? '');
        setAge(String(pet.age_years));
        setWeight(String(pet.weight_kg));
        setSterilized(pet.sterilized);
        setExistingImageUrl(pet.image_url);
        const alerts = pet.medical_alerts ?? [];
        setAllergies(alerts[0] ?? '');
        setMedication(alerts[1] ?? '');
      }
    }).catch(() => {}).finally(() => setLoadingPet(false));
  }, [petId]);

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Nombre requerido'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        breed: breed.trim(),
        age_years: parseInt(age) || 0,
        weight_kg: parseFloat(weight) || 0,
        sterilized,
        medical_alerts: [allergies.trim(), medication.trim()].filter(Boolean),
        localImageUri: localImageUri ?? undefined,
      };
      if (isEdit && petId) {
        await updatePet(petId, { ...payload, existingImageUrl: existingImageUrl ?? undefined });
      } else {
        await addPet(payload);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso requerido'); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setLocalImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setLocalImageUri(result.assets[0].uri);
  };

  const handlePhotoPress = () => {
    if (Platform.OS === 'web') { pickPhoto(); return; }
    Alert.alert('Foto', '', [
      { text: 'Cámara', onPress: takePhoto },
      { text: 'Galería', onPress: pickPhoto },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const displayUri = localImageUri ?? existingImageUrl;

  if (loadingPet) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Michi Ficha</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.photoUpload} onPress={handlePhotoPress} activeOpacity={0.8}>
          {displayUri ? (
            <>
              <Image source={{ uri: displayUri }} style={styles.photoPreview} />
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
          <Text style={styles.inputLabel}>Nombre</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej. Garfield" placeholderTextColor={colors.textMuted} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Raza</Text>
          <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="Ej. Mestizo, Siamés, Persa" placeholderTextColor={colors.textMuted} />
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Edad (años)</Text>
            <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="3" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Peso (kg)</Text>
            <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="4.5" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.inputLabel}>Esterilizado</Text>
          <Switch value={sterilized} onValueChange={setSterilized} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.surface} />
        </View>

        <Text style={styles.sectionTitle}>Anamnesis Crítica (Zero Trust)</Text>
        <View style={styles.warningBox}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabelWarning}>Alergias o Condiciones Crónicas</Text>
            <TextInput style={[styles.input, styles.inputWarning, styles.inputMultiline]} value={allergies} onChangeText={setAllergies} placeholder="Alergia alimentaria, rinitis, condición crónica..." placeholderTextColor={colors.dangerBorder} multiline numberOfLines={3} textAlignVertical="top" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabelWarning}>Medicación (si aplica)</Text>
            <TextInput style={[styles.input, styles.inputWarning, styles.inputMultiline]} value={medication} onChangeText={setMedication} placeholder="Cantidades y horarios exactos..." placeholderTextColor={colors.dangerBorder} multiline numberOfLines={3} textAlignVertical="top" />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSubmit} activeOpacity={0.8} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitBtnText}>{isEdit ? 'Guardar cambios' : 'Registrar Felino'}</Text>}
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  warningBox: { backgroundColor: colors.dangerBg, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.dangerBorder, marginBottom: 16 },
  inputLabelWarning: { fontSize: 13, fontWeight: '700', color: colors.dangerText, marginBottom: 6 },
  inputWarning: { backgroundColor: colors.surface, borderColor: colors.dangerBorder },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
