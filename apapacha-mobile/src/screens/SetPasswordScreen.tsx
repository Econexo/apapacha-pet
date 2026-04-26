import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { supabase } from '../../supabase';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const { refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = password.length >= 8 && password === confirm;

  const handleSet = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await refreshProfile();
      navigation.replace('MainTabs');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo establecer la contraseña');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id);
    }
    await refreshProfile();
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>Crea tu contraseña</Text>
        <Text style={styles.subtitle}>
          Opcional pero recomendado — te permite ingresar sin depender del enlace por email cada vez.
        </Text>

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput
          style={[styles.input, confirm.length > 0 && password !== confirm && styles.inputError]}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repite la contraseña"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />
        {confirm.length > 0 && password !== confirm && (
          <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
        )}

        <TouchableOpacity
          style={[styles.btn, !isValid && styles.btnDisabled]}
          onPress={handleSet}
          disabled={!isValid || saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.btnText}>Establecer Contraseña</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Omitir por ahora</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, padding: 28, justifyContent: 'center' },
  emoji: { fontSize: 52, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textMain, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 36 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 8 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, fontSize: 15, color: colors.textMain, marginBottom: 20 },
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 12, color: colors.danger, marginTop: -16, marginBottom: 16, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
  skipBtn: { alignItems: 'center', padding: 12 },
  skipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
