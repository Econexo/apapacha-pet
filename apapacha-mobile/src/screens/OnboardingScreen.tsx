import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { supabase } from '../../supabase';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = fullName.trim().length >= 2 && lastName.trim().length >= 2
    && Number(age) >= 18 && address.trim().length >= 5;

  const handleSave = async () => {
    if (!isValid) return;
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      Alert.alert('Edad inválida', 'Debes tener al menos 18 años para usar ApapachaPet.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sin sesión');
      const { error } = await supabase.from('profiles').update({
        full_name: fullName.trim(),
        last_name: lastName.trim(),
        age: ageNum,
        address: address.trim(),
        bio: bio.trim() || null,
        onboarding_done: true,
      }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      navigation.replace('SetPassword');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.emoji}>🐱</Text>
          <Text style={styles.title}>Cuéntanos sobre ti</Text>
          <Text style={styles.subtitle}>
            Antes de continuar necesitamos algunos datos para que la comunidad ApapachaPet pueda conocerte.
          </Text>

          <Field label="Nombre *" value={fullName} onChange={setFullName} placeholder="Ej: María" />
          <Field label="Apellido *" value={lastName} onChange={setLastName} placeholder="Ej: González" />
          <Field label="Edad *" value={age} onChange={setAge} placeholder="Ej: 28" keyboardType="number-pad" />
          <Field label="Dirección *" value={address} onChange={setAddress} placeholder="Calle, número, ciudad" />

          <Text style={styles.label}>Conocimientos o experiencia con animales</Text>
          <Text style={styles.labelHint}>Opcional — si eres o quieres ser cuidador, cuéntalo aquí</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Ej: Técnica veterinaria con 5 años de experiencia en felinos..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.btn, !isValid && styles.btnDisabled]}
            onPress={handleSave}
            disabled={!isValid || saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={colors.surface} />
              : <Text style={styles.btnText}>Continuar →</Text>
            }
          </TouchableOpacity>

          <Text style={styles.footnote}>* Campos obligatorios</Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { padding: 28, paddingBottom: 48 },
  emoji: { fontSize: 52, textAlign: 'center', marginTop: 16, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textMain, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 6 },
  labelHint: { fontSize: 12, color: colors.textMuted, marginBottom: 8, marginTop: -4 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, fontSize: 15, color: colors.textMain, marginBottom: 20 },
  textarea: { height: 100, marginBottom: 28 },
  btn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
  footnote: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
