import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { sendOTP, verifyOTP } from '../services/auth.service';

export function LoginScreen() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendOTP(email.trim().toLowerCase());
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (token.length !== 6) return;
    setLoading(true);
    try {
      await verifyOTP(email.trim().toLowerCase(), token);
      // App.tsx detecta la sesión automáticamente via AuthContext
    } catch (e: any) {
      Alert.alert('Código incorrecto', e.message ?? 'El código no es válido o expiró');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoIcon}>🐾</Text>
          </View>
          <Text style={styles.brandName}>ApapachaPet</Text>
          <Text style={styles.brandSubtitle}>Hospitalidad Felina Premium</Text>
        </View>

        <View style={styles.authContainer}>
          {step === 'email' ? (
            <>
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
              <TouchableOpacity
                style={[styles.authButton, loading && styles.authButtonDisabled]}
                onPress={handleSendOTP}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.primaryDark} />
                  : <Text style={styles.authButtonText}>Continuar con email seguro</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.otpLabel}>Código enviado a {email}</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={token}
                onChangeText={setToken}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.authButton, loading && styles.authButtonDisabled]}
                onPress={handleVerifyOTP}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.primaryDark} />
                  : <Text style={styles.authButtonText}>Verificar código</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('email'); setToken(''); }}>
                <Text style={styles.backLink}>← Cambiar email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.trustDisclaimer}>
          <Text style={styles.trustTitle}>🔒 Política de Confianza Cero</Text>
          <Text style={styles.trustText}>
            En ApapachaPet la seguridad de tu gato es innegociable. Todas las cuentas nuevas
            (Dueños y Cuidadores) pasan por un cruce de antecedentes y validación de identidad
            antes de acceder al marketplace.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1, justifyContent: 'space-between', padding: 30, paddingTop: 80, paddingBottom: 50 },
  brandContainer: { alignItems: 'center' },
  logoPlaceholder: { width: 90, height: 90, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  logoIcon: { fontSize: 40 },
  brandName: { fontSize: 36, fontWeight: '800', color: colors.surface, letterSpacing: -1, marginBottom: 8 },
  brandSubtitle: { fontSize: 16, color: colors.surface, opacity: 0.8, fontWeight: '500', letterSpacing: 0.5 },
  authContainer: { width: '100%', gap: 16 },
  input: { backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 16, color: colors.textMain, width: '100%' },
  otpInput: { textAlign: 'center', fontSize: 28, fontWeight: '800', letterSpacing: 8 },
  otpLabel: { color: colors.surface, opacity: 0.8, fontSize: 14, textAlign: 'center' },
  authButton: { backgroundColor: colors.surface, paddingVertical: 16, borderRadius: 12, alignItems: 'center', width: '100%' },
  authButtonDisabled: { opacity: 0.6 },
  authButtonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
  backLink: { color: colors.surface, opacity: 0.7, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  trustDisclaimer: { backgroundColor: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  trustTitle: { color: colors.surface, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  trustText: { color: colors.surface, opacity: 0.7, fontSize: 12, lineHeight: 18 },
});
