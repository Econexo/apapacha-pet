import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadAvatar } from '../services/profile.service';

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { profile, refreshProfile } = useAuth();

  const [fullName, setFullName]   = useState(profile?.full_name ?? '');
  const [lastName, setLastName]   = useState(profile?.last_name ?? '');
  const [age, setAge]             = useState(profile?.age != null ? String(profile.age) : '');
  const [address, setAddress]     = useState(profile?.address ?? '');
  const [bio, setBio]             = useState(profile?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarChanged(true);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre.');
      return;
    }
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url ?? undefined;
      if (avatarChanged && avatarUri) {
        avatar_url = await uploadAvatar(avatarUri);
      }
      await updateProfile({
        full_name: fullName.trim(),
        last_name: lastName.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
        address: address.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url,
      });
      await refreshProfile();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName.trim()
    ? fullName.trim().slice(0, 2).toUpperCase()
    : '??';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toca para cambiar foto</Text>

          <Field label="Nombre *" value={fullName} onChange={setFullName} placeholder="Tu nombre" />
          <Field label="Apellido" value={lastName} onChange={setLastName} placeholder="Tu apellido" />
          <Field label="Edad" value={age} onChange={setAge} placeholder="Ej: 28" keyboardType="number-pad" />
          <Field label="Dirección" value={address} onChange={setAddress} placeholder="Calle, número, ciudad" />

          <Text style={styles.label}>Conocimientos / Experiencia</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Ej: Técnica veterinaria con experiencia en felinos..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.infoBlock}>
            <Text style={styles.infoSub}>El email no se puede cambiar desde aquí.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.saveBtnText}>Guardar Cambios</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType = 'default' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; keyboardType?: any;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'default' ? 'words' : 'none'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  content: { padding: 24, paddingBottom: 80, alignItems: 'center' },
  avatarContainer: { marginTop: 8, marginBottom: 8 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: colors.surface, fontSize: 36, fontWeight: '700' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.surface, borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
  avatarEditIcon: { fontSize: 16 },
  avatarHint: { fontSize: 13, color: colors.textMuted, marginBottom: 28 },
  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 8 },
  input: { width: '100%', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, fontSize: 15, color: colors.textMain, marginBottom: 20 },
  textarea: { height: 100, marginBottom: 20 },
  infoBlock: { width: '100%', backgroundColor: colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  infoSub: { fontSize: 12, color: colors.textMuted },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
