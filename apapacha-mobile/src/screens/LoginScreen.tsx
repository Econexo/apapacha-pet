import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoIcon}>🐾</Text>
          </View>
          <Text style={styles.brandName}>ApapachaPet</Text>
          <Text style={styles.brandSubtitle}>Hospitalidad Felina Premium</Text>
        </View>

        {/* Cta Buttons */}
        <View style={styles.authContainer}>
          <TouchableOpacity style={styles.authButton} onPress={onLogin} activeOpacity={0.8}>
            <Text style={styles.authButtonText}>Continuar con email seguro</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.authButton, styles.authButtonSecondary]} onPress={onLogin} activeOpacity={0.8}>
            <Text style={styles.authButtonTextSecondary}>Continuar con ID Biométrico</Text>
          </TouchableOpacity>
        </View>

        {/* Zero Trust Disclaimer */}
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary, // Fondo Pino oscuro corporativo
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 30,
    paddingTop: 80,
    paddingBottom: 50,
  },
  brandContainer: {
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoIcon: {
    fontSize: 40,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -1,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 16,
    color: colors.surface,
    opacity: 0.8,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  authContainer: {
    width: '100%',
    gap: 16,
  },
  authButton: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  authButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  authButtonText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '700',
  },
  authButtonTextSecondary: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  trustDisclaimer: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 30,
  },
  trustTitle: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  trustText: {
    color: colors.surface,
    opacity: 0.7,
    fontSize: 12,
    lineHeight: 18,
  }
});
