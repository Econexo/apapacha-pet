import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Space } from '../types/database';
import { getSpaceById } from '../services/spaces.service';
import { getHostReviews } from '../services/reviews.service';
import type { Review } from '../services/reviews.service';
import { supabase } from '../../supabase';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SpaceDetail'>;

const { width: SCREEN_W } = Dimensions.get('window');
const PLACEHOLDER = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200';

export function SpaceDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { id } = route.params;
  const insets = useSafeAreaInsets();

  const [space, setSpace] = useState<Space | null>(null);
  const [hostName, setHostName] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const s = await getSpaceById(id);
        setSpace(s);
        const { data: prof } = await supabase
          .from('profiles').select('full_name').eq('id', s.host_id).single();
        if (prof) setHostName(prof.full_name);
        const rv = await getHostReviews(s.host_id);
        setReviews(rv.slice(0, 3));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!space) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: 12 }}>
      <Text style={{ fontSize: 48 }}>🏠</Text>
      <Text style={{ color: colors.textMuted, fontSize: 16 }}>Espacio no encontrado</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>← Volver</Text>
      </TouchableOpacity>
    </View>
  );

  const photos = space.image_urls?.length > 0 ? space.image_urls : [PLACEHOLDER];

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Photo carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={handleScroll} scrollEventThrottle={16}
          >
            {photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={[styles.heroImage, { width: SCREEN_W }]} />
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.backButton, { top: insets.top + 12 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          {photos.length > 1 && (
            <View style={styles.dotsRow}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {space.rating.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{space.title}</Text>
          <Text style={styles.location}>📍 {space.location}</Text>

          {space.features?.length > 0 && (
            <View style={styles.badgesRow}>
              {space.features.map((f, i) => (
                <View key={i} style={styles.badge}><Text style={styles.badgeText}>✓ {f}</Text></View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.hostRow}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostInitial}>{hostName ? hostName[0].toUpperCase() : '?'}</Text>
            </View>
            <View>
              <Text style={styles.hostName}>Hospedado por {hostName || 'Cuidador'}</Text>
              <Text style={styles.hostSubtitle}>✓ Identidad Verificada</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Sobre este espacio</Text>
          <Text style={styles.description}>{space.description}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            Reseñas {reviews.length > 0 ? `(${reviews.length})` : ''}
          </Text>
          {reviews.length > 0 ? reviews.map(r => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{r.reviewer_name}</Text>
                <Text style={styles.reviewStars}>{'⭐'.repeat(Math.min(r.rating, 5))}</Text>
              </View>
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              <Text style={styles.reviewDate}>
                {r.booking_start
                  ? new Date(r.booking_start).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
                  : ''}
              </Text>
            </View>
          )) : (
            <View style={styles.noReviews}>
              <Text style={styles.noReviewsText}>Sin reseñas aún — ¡sé el primero!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
        <View style={styles.footerContainer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceValue}>${space.price_per_night.toLocaleString('es-CL')}</Text>
            <Text style={styles.priceNight}> / noche</Text>
          </View>
          <TouchableOpacity
            style={styles.bookButton} activeOpacity={0.8}
            onPress={() => navigation.navigate('Checkout', { id: space.id, type: 'space' })}
          >
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
  carouselContainer: { height: 300, position: 'relative' },
  heroImage: { height: 300 },
  backButton: { position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 24, fontWeight: '700', color: colors.textMain },
  dotsRow: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  ratingBadge: { position: 'absolute', top: 12, right: 16, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  ratingText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textMain, marginBottom: 8, letterSpacing: -0.5 },
  location: { fontSize: 15, color: colors.textMuted, marginBottom: 16 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  badge: { backgroundColor: colors.infoBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.infoBorder },
  badgeText: { color: colors.info, fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  hostAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  hostInitial: { color: colors.surface, fontSize: 18, fontWeight: '800' },
  hostName: { fontSize: 16, fontWeight: '700', color: colors.textMain },
  hostSubtitle: { fontSize: 13, color: colors.accent, marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain, marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 24, color: colors.textMain, opacity: 0.85 },
  reviewCard: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  reviewStars: { fontSize: 12 },
  reviewComment: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 4 },
  reviewDate: { fontSize: 11, color: colors.textMuted },
  noReviews: { paddingVertical: 20, alignItems: 'center', backgroundColor: colors.background, borderRadius: 12 },
  noReviewsText: { fontSize: 14, color: colors.textMuted },
  footerSafeArea: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  footerContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center', justifyContent: 'space-between' },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  priceValue: { fontSize: 24, fontWeight: '800', color: colors.textMain },
  priceNight: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  bookButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  bookButtonText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
