import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { signIn, signUp } from '../services/auth.service';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (mode === 'login') {
        await signIn(email.trim().toLowerCase(), password);
      } else {
        await signUp(email.trim().toLowerCase(), password);
      }
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandContainer}>
          <Image source={require('../../assets/LogoSplash.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.brandSubtitle}>Hospitalidad Felina Premium</Text>
        </View>

        <View style={styles.authContainer}>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
              onPress={() => { setMode('login'); setErrorMsg(''); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>Ingresar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
              onPress={() => { setMode('signup'); setErrorMsg(''); }}
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

          {errorMsg ? <Text style={styles.errorMsg}>{errorMsg}</Text> : null}
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
  errorMsg: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 },
  demoBtn: { alignItems: 'center', paddingVertical: 10 },
  demoBtnText: { color: colors.surface, opacity: 0.5, fontSize: 12, fontWeight: '600' },
  trustDisclaimer: { backgroundColor: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  trustTitle: { color: colors.surface, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  trustText: { color: colors.surface, opacity: 0.7, fontSize: 12, lineHeight: 18 },
});
