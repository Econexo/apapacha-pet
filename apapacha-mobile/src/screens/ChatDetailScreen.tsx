import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '../theme/colors';

interface ChatDetailScreenProps {
  onBack: () => void;
}

export function ChatDetailScreen({ onBack }: ChatDetailScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>Roberto Valdés</Text>
        <View style={styles.placeholderSpace} />
      </View>

      {/* Zero Trust Commercial Banner */}
      <View style={styles.trustBanner}>
        <Text style={styles.trustBannerText}>
          ⚠️ Por tu seguridad y la garantía veterinaria, nunca realices pagos fuera de la plataforma ApapachaPet.
        </Text>
      </View>

      {/* Chat Area */}
      <ScrollView contentContainerStyle={styles.chatArea} showsVerticalScrollIndicator={false}>
        <Text style={styles.timestamp}>Hoy 10:30 AM</Text>
        
        {/* Recibido */}
        <View style={styles.bubbleReceived}>
          <Text style={styles.textReceived}>Hola Carlos, vi tu solicitud para Michi. ¿Qué medicamento toma?</Text>
        </View>

        {/* Enviado */}
        <View style={styles.bubbleSent}>
          <Text style={styles.textSent}>Hola Roberto. Toma una pastilla a las 8 AM todos los días. ¿Hay problema?</Text>
        </View>

        {/* Recibido */}
        <View style={styles.bubbleReceived}>
          <Text style={styles.textReceived}>¡Claro! Le administro el medicamento a la hora exacta. Soy Técnico Vet.</Text>
        </View>
      </ScrollView>

      {/* Input de Fake Chat */}
      <View style={styles.inputArea}>
        <View style={styles.inputBox}>
          <Text style={styles.inputTextPlaceholder}>Escribe un mensaje...</Text>
        </View>
        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    fontSize: 24,
    color: colors.primary,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  placeholderSpace: {
    width: 40,
  },
  trustBanner: {
    backgroundColor: '#FFFBEB', // Amarillo muy pálido
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  trustBannerText: {
    fontSize: 12,
    color: '#92400E', // Naranja/Marrón oscuro
    textAlign: 'center',
    fontWeight: '600',
  },
  chatArea: {
    padding: 16,
    paddingBottom: 40,
  },
  timestamp: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  bubbleReceived: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    maxWidth: '80%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textReceived: {
    fontSize: 15,
    color: colors.textMain,
    lineHeight: 20,
  },
  bubbleSent: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginBottom: 12,
  },
  textSent: {
    fontSize: 15,
    color: colors.surface,
    lineHeight: 20,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputTextPlaceholder: {
    color: colors.textMuted,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sendIcon: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  }
});
