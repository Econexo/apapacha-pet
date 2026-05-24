import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { signIn, signUp, resetPassword } from '../services/auth.service';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const localizeError = (msg: string): string => {
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Debes confirmar tu email antes de ingresar. Revisa tu bandeja de entrada.';
    if (msg.includes('User already registered')) return 'Este email ya tiene una cuenta. Ingresa con tu contraseña.';
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('Unable to validate email address')) return 'El formato del email no es válido.';
    if (msg.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos e intenta nuevamente.';
    return msg;
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    if (mode === 'signup' && password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (mode === 'login') {
        await signIn(email.trim().toLowerCase(), password);
      } else {
        const { needsConfirmation } = await signUp(email.trim().toLowerCase(), password);
        if (needsConfirmation) {
          setSuccessMsg('¡Cuenta creada! Revisa tu email para confirmar tu cuenta antes de ingresar.');
        }
      }
    } catch (e: any) {
      setErrorMsg(localizeError(e.message ?? 'Error al autenticar'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg('Ingresa tu email primero para recibir el enlace de recuperación.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await resetPassword(email.trim().toLowerCase());
      setSuccessMsg('¡Enlace enviado! Revisa tu email para restablecer tu contraseña.');
    } catch (e: any) {
      setErrorMsg(localizeError(e.message ?? 'No se pudo enviar el enlace'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandContainer}>
          <Image source={require('../../assets/Logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.brandSubtitle}>Hospitalidad Felina Premium</Text>
        </View>

        <View style={styles.authContainer}>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
              onPress={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>Ingresar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
              onPress={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.primaryDark} />
              : <Text style={styles.authButtonText}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>
            }
          </TouchableOpacity>

          {mode === 'login' && (
            <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={styles.forgotBtn}>
              <Text style={styles.forgotBtnText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          )}

          {errorMsg ? <Text style={styles.errorMsg}>{errorMsg}</Text> : null}
          {successMsg ? <Text style={styles.successMsg}>{successMsg}</Text> : null}
        </View>

        <View style={styles.trustDisclaimer}>
          <Text style={styles.trustTitle}>🔒 Política de Confianza Cero</Text>
          <Text style={styles.trustText}>
            En ApapachaPet la seguridad de tu gato es innegociable. Todas las cuentas nuevas
            pasan por validación de identidad antes de acceder al marketplace.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, justifyContent: 'space-between', padding: 30, paddingTop: 60, paddingBottom: 50 },
  brandContainer: { alignItems: 'center' },
  logoImage: { width: 200, height: 160, marginBottom: 8 },
  brandSubtitle: { fontSize: 15, color: colors.surface, opacity: 0.85, fontWeight: '600', letterSpacing: 0.5 },
  authContainer: { width: '100%', gap: 12 },
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4, marginBottom: 4 },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: colors.surface },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  modeBtnTextActive: { color: colors.primaryDark },
  input: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 16, color: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  authButton: { backgroundColor: colors.surface, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  authButtonDisabled: { opacity: 0.6 },
  authButtonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
  forgotBtn: { alignItems: 'center', paddingVertical: 4 },
  forgotBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  errorMsg: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 },
  successMsg: { color: '#4ade80', fontSize: 13, textAlign: 'center', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8, lineHeight: 18 },
  trustDisclaimer: { backgroundColor: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  trustTitle: { color: colors.surface, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  trustText: { color: colors.surface, opacity: 0.7, fontSize: 12, lineHeight: 18 },
});
