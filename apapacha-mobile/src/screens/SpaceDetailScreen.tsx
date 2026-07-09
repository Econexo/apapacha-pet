import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, shadows } from '../theme/design';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Avatar } from '../components/ui/Avatar';
import { RatingStars } from '../components/ui/RatingStars';
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
        const { data: prof, error: profErr } = await supabase
          .from('profiles').select('full_name').eq('id', s.host_id).single();
        if (profErr) console.error('[SpaceDetail] host profile:', profErr.message);
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
    <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
  );

  if (!space) return (
    <View style={[styles.center, { gap: 12 }]}>
      <Ionicons name="home-outline" size={46} color={colors.textMuted} />
      <AppText variant="body" color={colors.textMuted}>Espacio no encontrado</AppText>
      <TouchableOpacity onPress={() => navigation.goBack()}><AppText variant="bodyStrong" color={colors.primary}>← Volver</AppText></TouchableOpacity>
    </View>
  );

  const photos = (space.image_urls && space.image_urls.length > 0) ? space.image_urls : [PLACEHOLDER];
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.carouselContainer}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16}>
            {photos.map((uri, i) => <Image key={i} source={{ uri }} style={[styles.heroImage, { width: SCREEN_W }]} />)}
          </ScrollView>
          <TouchableOpacity style={[styles.backButton, { top: insets.top + 12 }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.textMain} />
          </TouchableOpacity>
          {photos.length > 1 && (
            <View style={styles.dotsRow}>
              {photos.map((_, i) => <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />)}
            </View>
          )}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={13} color={colors.gold} />
            <Text style={styles.ratingText}>{space.rating > 0 ? space.rating.toFixed(1) : 'Nuevo'}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <AppText variant="display2">{space.title}</AppText>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <AppText variant="body" color={colors.textMuted}>{space.location}</AppText>
          </View>

          {space.features?.length > 0 && (
            <View style={styles.badgesRow}>
              {space.features.map((f, i) => <Chip key={i} label={f} icon="checkmark-circle" tone="leaf" />)}
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.hostRow}>
            <Avatar name={hostName} size={48} gradient />
            <View>
              <AppText variant="bodyStrong">Hospedado por {hostName || 'Cuidador'}</AppText>
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={13} color={colors.success} />
                <AppText variant="small" color={colors.successText}>Identidad Verificada</AppText>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <AppText variant="title" style={{ marginBottom: 12 }}>Sobre este espacio</AppText>
          <AppText variant="body" color={colors.textMain} style={{ lineHeight: 24, opacity: 0.9 }}>{space.description}</AppText>

          <View style={styles.divider} />

          <AppText variant="title" style={{ marginBottom: 14 }}>Reseñas {reviews.length > 0 ? `(${reviews.length})` : ''}</AppText>
          {reviews.length > 0 ? reviews.map(r => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <AppText variant="bodyStrong" style={{ fontSize: 14 }}>{r.reviewer_name}</AppText>
                <RatingStars value={r.rating} size={12} showValue={false} />
              </View>
              {r.comment ? <AppText variant="small" color={colors.textMuted} style={{ lineHeight: 20 }}>{r.comment}</AppText> : null}
              <AppText variant="small" color={colors.textMuted} style={{ fontSize: 11, marginTop: 4 }}>
                {r.booking_start ? new Date(r.booking_start).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }) : ''}
              </AppText>
            </View>
          )) : (
            <View style={styles.noReviews}><AppText variant="small" color={colors.textMuted}>Sin reseñas aún — ¡sé el primero!</AppText></View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
        <View style={styles.footerContainer}>
          <View style={styles.priceContainer}>
            <AppText variant="display2" style={{ fontSize: 24 }}>${space.price_per_night.toLocaleString('es-CL')}</AppText>
            <AppText variant="small" color={colors.textMuted}> /noche</AppText>
          </View>
          <Button label="Solicitar cuidado" icon="calendar" onPress={() => navigation.navigate('Checkout', { id: space.id, type: 'space' })} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { paddingBottom: 110 },
  carouselContainer: { height: 300, position: 'relative' },
  heroImage: { height: 300, backgroundColor: colors.surfaceAlt },
  backButton: { position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  dotsRow: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  ratingBadge: { position: 'absolute', top: 12, right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.full },
  ratingText: { color: colors.textMain, fontWeight: '800', fontSize: 13 },
  content: { padding: 24 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginBottom: 14 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 22 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  reviewCard: { backgroundColor: colors.background, borderRadius: radii.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noReviews: { paddingVertical: 20, alignItems: 'center', backgroundColor: colors.background, borderRadius: radii.md },
  footerSafeArea: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  footerContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
});
