import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { colors } from '../theme/colors';

interface VisiterDetailScreenProps {
  id: string;
  onBack: () => void;
  onNavigateToRequest: () => void;
}

export function VisiterDetailScreen({ id, onBack, onNavigateToRequest }: VisiterDetailScreenProps) {
  // Datos simulados (Mock data)
  const visiter = {
    name: 'Roberto Valdés',
    professionTitle: 'Auxiliar Veterinario Especialista',
    rating: 4.98,
    totalVisits: 342,
    punctuality: '99%',
    pricePerVisit: 8500,
    imageUrl: 'https://images.unsplash.com/photo-1537368910025-7028ba0a464a?q=80&w=1000&auto=format&fit=crop',
    bio: 'Hola, soy Roberto. Me dedico exclusivamente a visitas a domicilio para felinos. Trabajo en conjunto con clínicas veterinarias y puedo administrar medicación inyectable si es requerido. Llevo mis propios juguetes esterilizados.',
    badges: ['Verificación de Identidad', 'Antecedentes Limpios', 'Técnico Veterinario']
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeAreaTop}>
         <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Atrás</Text>
         </TouchableOpacity>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Cabecera del Perfil */}
        <View style={styles.headerProfile}>
          <Image source={{ uri: visiter.imageUrl }} style={styles.avatarLarge} />
          <Text style={styles.name}>{visiter.name}</Text>
          <Text style={styles.profession}>{visiter.professionTitle}</Text>
          
          <View style={styles.badgeContainer}>
             {visiter.badges.map((badge, idx) => (
                <View key={idx} style={styles.badge}>
                  <Text style={styles.badgeText}>✓ {badge}</Text>
                </View>
             ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Gig Metrics (Confianza) */}
        <Text style={styles.sectionTitle}>Métricas de Servicio</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>⭐ {visiter.rating}</Text>
            <Text style={styles.metricLab}>Calificación</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>🚗 {visiter.totalVisits}</Text>
            <Text style={styles.metricLab}>Visitas Totales</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>⏱️ {visiter.punctuality}</Text>
            <Text style={styles.metricLab}>Puntualidad</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Descripción */}
        <Text style={styles.sectionTitle}>Sobre Mí</Text>
        <Text style={styles.bioText}>{visiter.bio}</Text>

      </ScrollView>

      {/* Footer CTA */}
      <SafeAreaView style={styles.footerSafeArea}>
        <View style={styles.footerContainer}>
          <View style={styles.priceContainer}>
             <Text style={styles.priceValue}>${visiter.pricePerVisit}</Text>
             <Text style={styles.priceNight}> / visita (40m)</Text>
          </View>
          <TouchableOpacity 
            style={styles.bookButton} 
            activeOpacity={0.8}
            onPress={onNavigateToRequest}
          >
             <Text style={styles.bookButtonText}>Agendar Visita</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  safeAreaTop: {
    backgroundColor: colors.surface,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  headerProfile: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 10,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.border,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 4,
  },
  profession: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 24,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 4,
  },
  metricLab: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  bioText: {
    marginHorizontal: 24,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMain,
    opacity: 0.85,
  },
  footerSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textMain,
  },
  priceNight: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookButtonText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 16,
  }
});
