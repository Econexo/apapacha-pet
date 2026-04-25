import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Alert, ScrollView,
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

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
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
      await updateProfile({ full_name: fullName.trim(), avatar_url });
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />

        <View style={styles.infoBlock}>
          <Text style={styles.infoText}>
            📧 {profile?.id ? 'Email registrado en tu cuenta' : '—'}
          </Text>
          <Text style={styles.infoSub}>El email no se puede cambiar desde aquí.</Text>
        </View>
      </ScrollView>

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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  content: { padding: 24, paddingBottom: 80, alignItems: 'center' },
  avatarContainer: { marginTop: 16, marginBottom: 8 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: colors.surface, fontSize: 36, fontWeight: '700' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.surface, borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
  avatarEditIcon: { fontSize: 16 },
  avatarHint: { fontSize: 13, color: colors.textMuted, marginBottom: 32 },
  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 8 },
  input: { width: '100%', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: colors.textMain, marginBottom: 24 },
  infoBlock: { width: '100%', backgroundColor: colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  infoText: { fontSize: 14, color: colors.textMain, fontWeight: '600', marginBottom: 4 },
  infoSub: { fontSize: 12, color: colors.textMuted },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
