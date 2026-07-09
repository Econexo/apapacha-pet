import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { Button } from '../components/ui/Button';
import { signIn, signUp, resetPassword } from '../services/auth.service';

// Paw print decorations — deterministic positions so no hydration mismatch
const PAWS = [
  { top:  '6%',  left: '8%',  size: 28, opacity: 0.10, rotate: '-15deg' },
  { top: '12%',  right: '6%', size: 20, opacity: 0.08, rotate:  '20deg' },
  { top: '22%',  left: '3%',  size: 16, opacity: 0.07, rotate:  '-8deg' },
  { top: '30%',  right: '10%',size: 24, opacity: 0.09, rotate:  '30deg' },
  { top: '52%',  left: '5%',  size: 18, opacity: 0.07, rotate: '-25deg' },
  { top: '62%',  right: '4%', size: 22, opacity: 0.08, rotate:  '12deg' },
  { top: '75%',  left: '10%', size: 26, opacity: 0.09, rotate: '-10deg' },
  { top: '82%',  right: '8%', size: 18, opacity: 0.07, rotate:  '22deg' },
];

export function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const localizeError = (msg: string): string => {
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Confirma tu email antes de ingresar. Revisa tu bandeja de entrada.';
    if (msg.includes('User already registered')) return 'Este email ya tiene una cuenta. Ingresa con tu contraseña.';
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('Unable to validate email address')) return 'El formato del email no es válido.';
    if (msg.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
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

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#4A2070', '#7C4DBB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Decorative paw background */}
      {PAWS.map((p, i) => (
        <Ionicons
          key={i}
          name="paw"
          size={p.size}
          color="#fff"
          style={[styles.pawDecor, {
            top: p.top as any,
            ...(p.left !== undefined ? { left: p.left as any } : { right: (p as any).right as any }),
            opacity: p.opacity,
            transform: [{ rotate: p.rotate }],
          }]}
        />
      ))}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <Image source={require('../../assets/Logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandTagline}>Hospitalidad Felina Premium</Text>
            <View style={styles.brandBadge}>
              <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.brandBadgeText}>Comunidad verificada</Text>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {/* Mode toggle */}
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
                onPress={() => switchMode('login')}
                activeOpacity={0.8}
              >
                <Ionicons name="log-in-outline" size={15} color={mode === 'login' ? colors.primaryDark : colors.textMuted} />
                <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Ingresar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'signup' && styles.toggleBtnActive]}
                onPress={() => switchMode('signup')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add-outline" size={15} color={mode === 'signup' ? colors.primaryDark : colors.textMuted} />
                <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>Crear cuenta</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardTitle}>
              {mode === 'login' ? 'Bienvenido de vuelta' : 'Únete a ApapachaPet'}
            </Text>
            <Text style={styles.cardSub}>
              {mode === 'login' ? 'Ingresa para acceder a tu cuenta' : 'Crea tu cuenta gratuitamente'}
            </Text>

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Contraseña</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 44 }]}
                  placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : '••••••••'}
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(v => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Feedback messages */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}
            {successMsg ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <Button
              label={mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              icon={mode === 'login' ? 'log-in' : 'person-add'}
              loading={loading}
              onPress={handleSubmit}
              style={{ width: '100%', marginTop: 4 }}
            />

            {mode === 'login' && (
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={styles.forgotBtn}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Trust section */}
          <View style={styles.trust}>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.trustText}>Identidad verificada</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.trustText}>Datos encriptados</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Ionicons name="paw-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.trustText}>100% para gatos</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primaryDark },

  pawDecor: { position: 'absolute', zIndex: 0 },

  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 24 },

  // Brand
  brand: { alignItems: 'center', gap: 6, zIndex: 1 },
  logo: { width: 180, height: 140 },
  brandTagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 0.8 },
  brandBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  brandBadgeText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  // Card
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, gap: 14, zIndex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 },

  toggle: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9 },
  toggleBtnActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  toggleText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  toggleTextActive: { color: colors.primaryDark },

  cardTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.textMain, marginTop: 2, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: -6 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textMain },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 15, color: colors.textMain },
  eyeBtn: { padding: 13 },

  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.dangerBorder },
  errorText: { flex: 1, color: colors.dangerText, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  successBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.successBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.successBorder },
  successText: { flex: 1, color: colors.successText, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.surface, fontSize: 16, fontWeight: '800' },

  forgotBtn: { alignItems: 'center', paddingVertical: 2 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  // Trust
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 1 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  trustDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
});
