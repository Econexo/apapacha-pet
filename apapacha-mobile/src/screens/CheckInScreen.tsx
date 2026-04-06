import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { ChecklistRow } from '../components/ChecklistRow';

export function CheckInScreen() {
  const [checklist, setChecklist] = useState({
    medical: false,
    carrier: false,
    feeding: false,
  });

  const allChecked = checklist.medical && checklist.carrier && checklist.feeding;

  const handleStartStay = () => {
    if (!allChecked) {
      Alert.alert('Transición Incompleta', 'Por favor confirma todos los puntos de seguridad para continuar.');
      return;
    }
    Alert.alert('¡Check-in Seguro Completado!', 'Se ha iniciado la estancia del huésped felino de manera oficial en ApapachaPet.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Encabezado Visual */}
        <View style={styles.headerImageContainer}>
          {/* Imagen ilustrativa del espacio del Sitter */}
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=1000&auto=format&fit=crop' }} 
            style={styles.headerImage} 
          />
          <View style={styles.headerOverlay}>
            <Text style={styles.headerTitle}>Check-in Seguro</Text>
            <Text style={styles.headerSubtitle}>Villa Felina Premium</Text>
          </View>
        </View>

        {/* Ficha del Huésped */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Huésped Felino</Text>
          <View style={styles.guestRow}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?q=80&w=300&auto=format&fit=crop' }} 
              style={styles.guestAvatar} 
            />
            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>Michi</Text>
              <Text style={styles.guestDetail}>3 años • Mackerel Tabby</Text>
              <Text style={styles.guestNote}>Nota Médica: Alérgico al pollo.</Text>
            </View>
          </View>
        </View>

        {/* Cuestionario Zero Trust (Transición Segura) */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>Protocolo de Transición</Text>
          <Text style={styles.sectionDescription}>
            Como medida de seguridad fundamental, validad los siguientes puntos con el anfitrión antes de retirarte.
          </Text>

          <ChecklistRow 
            label="Instrucciones médicas y alergias comunicadas"
            checked={checklist.medical}
            onToggle={() => setChecklist(prev => ({ ...prev, medical: !prev.medical }))}
          />
          <ChecklistRow 
            label="Transportadora entregada y debidamente asegurada"
            checked={checklist.carrier}
            onToggle={() => setChecklist(prev => ({ ...prev, carrier: !prev.carrier }))}
          />
          <ChecklistRow 
            label="Horarios y porciones exactas de comida revisados"
            checked={checklist.feeding}
            onToggle={() => setChecklist(prev => ({ ...prev, feeding: !prev.feeding }))}
          />
        </View>

        {/* Botón de Acción Principal */}
        <TouchableOpacity 
          style={[styles.primaryButton, !allChecked && styles.primaryButtonDisabled]}
          onPress={handleStartStay}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Iniciar Estancia Oficial</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  headerImageContainer: {
    height: 220,
    width: '100%',
    position: 'relative',
    marginBottom: 20,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.5)', 
  },
  headerTitle: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: colors.surface,
    fontSize: 16,
    opacity: 0.9,
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 22,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  guestDetail: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  guestNote: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 6,
  },
  checklistSection: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border, 
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  }
});
