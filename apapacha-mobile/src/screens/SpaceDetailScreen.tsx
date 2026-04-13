import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailHeroSkeleton } from '../components/Skeleton';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SpaceDetailScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loading ? <DetailHeroSkeleton /> : <>
          <View style={styles.imageContainer}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2000&auto=format&fit=crop' }} style={styles.heroImage} />
            <TouchableOpacity style={[styles.backButton, { top: insets.top + 12 }]} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Depto Malla Completa Centro, 100% Catified</Text>
            <Text style={styles.location}>Providencia, Santiago</Text>

            <View style={styles.badgesRow}>
              <View style={styles.badge}><Text style={styles.badgeText}>Mallas Certificadas</Text></View>
              <View style={styles.badge}><Text style={styles.badgeText}>Sin otros animales</Text></View>
            </View>

            <View style={styles.divider} />

            <View style={styles.hostRow}>
              <View style={styles.hostAvatar}><Text style={styles.hostInitial}>M</Text></View>
              <View>
                <Text style={styles.hostName}>Hospedado por María</Text>
                <Text style={styles.hostSubtitle}>Identidad Verificada (Zero Trust)</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Sobre este espacio</Text>
            <Text style={styles.description}>
              Departamento diseñado exclusivamente para gatos. Cuenta con repisas aéreas, rascadores de techo a piso y mallas de seguridad certificadas anti-mordidas en todas las ventanas y balcón.
            </Text>

            <View style={styles.amenities}>
              <Text style={styles.amenityItem}>✓ Comederos Inclinados</Text>
              <Text style={styles.amenityItem}>✓ Fuente de Agua Limpia</Text>
              <Text style={styles.amenityItem}>✓ Arenero Cerrado</Text>
              <Text style={styles.amenityItem}>✓ Monitoreo Webcam 24/7</Text>
            </View>
          </View>
        </>}
      </ScrollView>

      <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
        <View style={styles.footerContainer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceValue}>$15.000</Text>
            <Text style={styles.priceNight}> / noche</Text>
          </View>
          <TouchableOpacity style={styles.bookButton} activeOpacity={0.8} onPress={() => navigation.navigate('Checkout', { id: '1', type: 'space' })}>
            <Text style={styles.bookButtonText}>Solicitar Cuidado</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { paddingBottom: 100 },
  imageContainer: { width: '100%', height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  backButton: { position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 24, fontWeight: '700', color: colors.textMain },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textMain, marginBottom: 8, letterSpacing: -0.5 },
  location: { fontSize: 16, color: colors.textMuted, marginBottom: 16 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  badge: { backgroundColor: colors.infoBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.infoBorder },
  badgeText: { color: colors.info, fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
  hostRow: { flexDirection: 'row', alignItems: 'center' },
  hostAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  hostInitial: { color: colors.surface, fontSize: 18, fontWeight: '800' },
  hostName: { fontSize: 16, fontWeight: '700', color: colors.textMain },
  hostSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain, marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 24, color: colors.textMain, opacity: 0.85, marginBottom: 24 },
  amenities: { backgroundColor: colors.background, padding: 16, borderRadius: 12 },
  amenityItem: { fontSize: 15, color: colors.textMain, marginBottom: 8, fontWeight: '500' },
  footerSafeArea: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  footerContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center', justifyContent: 'space-between' },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  priceValue: { fontSize: 24, fontWeight: '800', color: colors.textMain },
  priceNight: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  bookButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  bookButtonText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
