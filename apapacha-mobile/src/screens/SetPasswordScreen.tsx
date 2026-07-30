import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { supabase } from '../../supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export type SetPasswordVariant = 'onboarding' | 'recovery' | 'change';

// Copy por variante. 'onboarding' es el paso opcional al crear la cuenta;
// 'recovery' llega desde el enlace de "restablecer contraseña"; 'change' se
// abre desde Perfil → Cuenta.
const COPY: Record<SetPasswordVariant, { title: string; subtitle: string; cta: string }> = {
  onboarding: {
    title: 'Crea tu contraseña',
    subtitle: 'Opcional pero recomendado — te permite ingresar sin depender del enlace por email cada vez.',
    cta: 'Establecer contraseña',
  },
  recovery: {
    title: 'Restablece tu contraseña',
    subtitle: 'Elige una contraseña nueva para tu cuenta. La usarás la próxima vez que ingreses.',
    cta: 'Guardar contraseña nueva',
  },
  change: {
    title: 'Cambiar contraseña',
    subtitle: 'Elige una contraseña nueva. Reemplazará a la actual en todos tus dispositivos.',
    cta: 'Guardar contraseña nueva',
  },
};

export function SetPasswordScreen({ variant = 'onboarding' }: { variant?: SetPasswordVariant }) {
  const navigation = useNavigation<Nav>();
  const { refreshProfile, clearPasswordRecovery } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const copy = COPY[variant];
  const isValid = password.length >= 8 && password === confirm;

  const handleSet = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await refreshProfile();
      // Salir del modo recuperación antes de navegar: si no, RootNavigator
      // volvería a mandar al usuario a esta misma pantalla.
      clearPasswordRecovery();
      toast.success(
        variant === 'onboarding' ? 'Contraseña creada' : 'Contraseña actualizada',
        'Ya puedes usarla para ingresar.',
      );
      if (variant === 'change') navigation.goBack();
      else navigation.replace('MainTabs');
    } catch (e: any) {
      toast.error('Error', e.message ?? 'No se pudo establecer la contraseña');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id);
        if (error) throw error;
      }
      await refreshProfile();
      navigation.replace('MainTabs');
    } catch (e: any) {
      toast.error('Error', e.message ?? 'No se pudo continuar. Intenta de nuevo.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

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
            : <Text style={styles.btnText}>{copy.cta}</Text>
          }
        </TouchableOpacity>

        {/* Salida según el contexto. En 'recovery' nunca dejamos al usuario
            atrapado: si se arrepiente, cancelar sale del modo recuperación y
            lo lleva a la app (el enlace ya le dejó sesión iniciada). */}
        {variant === 'onboarding' && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Omitir por ahora</Text>
          </TouchableOpacity>
        )}
        {variant === 'recovery' && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => { clearPasswordRecovery(); navigation.replace('MainTabs'); }}
          >
            <Text style={styles.skipText}>Cancelar</Text>
          </TouchableOpacity>
        )}
        {variant === 'change' && (
          <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.skipText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, padding: 28, justifyContent: 'center' },
  iconWrap: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.textMain, textAlign: 'center', marginBottom: 8, letterSpacing: -0.4 },
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
