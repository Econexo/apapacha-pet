import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { colors } from '../theme/colors';

interface SpaceDetailScreenProps {
  id: string; // En una app real tomaríamos el ID para hacer fetch de los datos
  onBack: () => void;
  onNavigateToCheckIn: () => void;
}

export function SpaceDetailScreen({ id, onBack, onNavigateToCheckIn }: SpaceDetailScreenProps) {
  // Simulamos los datos del espacio seleccionado
  const space = {
    title: 'Depto Malla Completa Centro, 100% Catified',
    location: 'Providencia, Santiago',
    pricePerNight: 15000,
    rating: 4.96,
    reviews: 124,
    hostName: 'María',
    hostTitle: 'Enfermera Veterinaria Especialista',
    description: 'Mi departamento fue rediseñado pensando exclusivamente en la seguridad y entretenimiento de huéspedes felinos. Cuenta con mallas de acero invisible certificadas en todas las ventanas y balcón. No tengo otras de mascotas y soy experta en administración de medicamentos orales.',
    coverImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2000&auto=format&fit=crop',
    safetyBadges: ['Mallas Certificadas', 'Libre Plantas Tóxicas', 'Sin Otras Mascotas', 'Botiquín Felino']
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Encabezado con imagen */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: space.coverImage }} style={styles.image} />
          
          <SafeAreaView style={styles.floatingHeader}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Atrás</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          {/* Título Principal */}
          <Text style={styles.title}>{space.title}</Text>
          <Text style={styles.ratingText}>
            ★ {space.rating} <Text style={styles.reviewsText}>({space.reviews} reseñas)</Text> • {space.location}
          </Text>

          <View style={styles.divider} />

          {/* Sitter Section */}
          <View style={styles.hostSection}>
            <View style={styles.hostText}>
              <Text style={styles.hostName}>Hospedado por {space.hostName}</Text>
              <Text style={styles.hostTitle}>{space.hostTitle}</Text>
            </View>
            <View style={styles.avatarPlaceholder} />
          </View>

          <View style={styles.divider} />

          {/* Safety Badges (Zero Trust translation to UI) */}
          <Text style={styles.sectionTitle}>Protocolos de Seguridad</Text>
          <View style={styles.badgesContainer}>
            {space.safetyBadges.map((badge, idx) => (
              <View key={idx} style={styles.badge}>
                <Text style={styles.badgeText}>✓ {badge}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>Acerca de este espacio</Text>
          <Text style={styles.description}>{space.description}</Text>

        </View>
      </ScrollView>

      {/* Footer Fijo / CTA */}
      <SafeAreaView style={styles.footerSafeArea}>
        <View style={styles.footerContainer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceValue}>${space.pricePerNight}</Text>
            <Text style={styles.priceNight}> / noche</Text>
          </View>
          <TouchableOpacity 
            style={styles.bookButton} 
            activeOpacity={0.8}
            onPress={onNavigateToCheckIn}
          >
            <Text style={styles.bookButtonText}>Solicitar / Ir a CheckIn</Text>
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
  scrollContent: {
    paddingBottom: 100, // Espacio para el footer flotante
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButtonText: {
    fontWeight: '700',
    color: colors.textMain,
    fontSize: 14,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  reviewsText: {
    fontWeight: '400',
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  hostSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hostText: {
    flex: 1,
    paddingRight: 16,
  },
  hostName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
  },
  hostTitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: colors.textMain,
    lineHeight: 24,
    opacity: 0.85,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  badgeText: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
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
    fontSize: 20,
    fontWeight: '800',
    color: colors.textMain,
  },
  priceNight: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookButtonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  }
});
