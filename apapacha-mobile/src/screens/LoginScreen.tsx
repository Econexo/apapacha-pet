import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { sendOTP } from '../services/auth.service';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await sendOTP(email.trim().toLowerCase());
      setStep('sent');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'No se pudo enviar el enlace');
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
                onPress={handleSend}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.primaryDark} />
                  : <Text style={styles.authButtonText}>Continuar con email seguro</Text>
                }
              </TouchableOpacity>
              <Text style={styles.registerHint}>¿Primera vez? Tu cuenta se crea automáticamente.</Text>
              {errorMsg ? <Text style={styles.errorMsg}>{errorMsg}</Text> : null}
            </>
          ) : (
            <>
              <View style={styles.sentBox}>
                <Text style={styles.sentIcon}>📬</Text>
                <Text style={styles.sentTitle}>Revisa tu correo</Text>
                <Text style={styles.sentDesc}>Enviamos un enlace de acceso a{'\n'}<Text style={styles.sentEmail}>{email}</Text></Text>
                <Text style={styles.sentHint}>Haz clic en el botón del email para entrar.</Text>
              </View>
              <TouchableOpacity onPress={() => { setStep('email'); setErrorMsg(''); }}>
                <Text style={styles.backLink}>← Usar otro email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('MainTabs')} style={styles.demoBtn}>
          <Text style={styles.demoBtnText}>👁 Ver Demo (sin login)</Text>
        </TouchableOpacity>

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
  authContainer: { width: '100%', gap: 16 },
  input: { backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 16, color: colors.textMain },
  authButton: { backgroundColor: colors.surface, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  authButtonDisabled: { opacity: 0.6 },
  authButtonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
  registerHint: { color: colors.surface, opacity: 0.6, fontSize: 12, textAlign: 'center' },
  errorMsg: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 },
  sentBox: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  sentIcon: { fontSize: 48 },
  sentTitle: { fontSize: 22, fontWeight: '800', color: colors.surface },
  sentDesc: { fontSize: 14, color: colors.surface, opacity: 0.8, textAlign: 'center', lineHeight: 20 },
  sentEmail: { fontWeight: '700', opacity: 1 },
  sentHint: { fontSize: 13, color: colors.surface, opacity: 0.6, textAlign: 'center', marginTop: 4 },
  backLink: { color: colors.surface, opacity: 0.7, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  trustDisclaimer: { backgroundColor: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  trustTitle: { color: colors.surface, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  trustText: { color: colors.surface, opacity: 0.7, fontSize: 12, lineHeight: 18 },
  demoBtn: { alignItems: 'center', paddingVertical: 10 },
  demoBtnText: { color: colors.surface, opacity: 0.5, fontSize: 12, fontWeight: '600' },
});
