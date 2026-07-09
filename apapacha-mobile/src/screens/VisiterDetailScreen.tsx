import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, shadows } from '../theme/design';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { RatingStars } from '../components/ui/RatingStars';
import type { RootStackParamList } from '../types/navigation';
import type { Visiter } from '../types/database';
import { getVisiterById } from '../services/visiters.service';
import { getHostReviews, getHostStats } from '../services/reviews.service';
import type { Review } from '../services/reviews.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'VisiterDetail'>;

const PLACEHOLDER = 'https://images.unsplash.com/photo-1537368910025-7028ba0a464a?q=80&w=1000';

export function VisiterDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { id } = route.params;
  const insets = useSafeAreaInsets();

  const [visiter, setVisiter] = useState<Visiter | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const v = await getVisiterById(id);
        setVisiter(v);
        const rv = await getHostReviews(v.host_id);
        const stats = await getHostStats(v.host_id, rv);
        setReviews(rv.slice(0, 3));
        setAvgRating(stats.avgRating);
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

  if (!visiter) return (
    <View style={[styles.center, { gap: 12 }]}>
      <Ionicons name="paw-outline" size={46} color={colors.textMuted} />
      <AppText variant="body" color={colors.textMuted}>Cuidador no encontrado</AppText>
      <TouchableOpacity onPress={() => navigation.goBack()}><AppText variant="bodyStrong" color={colors.primary}>← Volver</AppText></TouchableOpacity>
    </View>
  );

  const displayRating = avgRating > 0 ? avgRating : visiter.rating;

  const metrics: { icon: any; val: string; lab: string }[] = [
    { icon: 'star', val: displayRating > 0 ? displayRating.toFixed(1) : 'Nuevo', lab: 'Calificación' },
    { icon: 'paw', val: String(visiter.total_visits), lab: 'Visitas' },
    { icon: 'chatbubble-ellipses', val: String(reviews.length), lab: 'Reseñas' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <AppText variant="bodyStrong" color={colors.primary}>Atrás</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerProfile}>
          <Image source={{ uri: visiter.image_url ?? PLACEHOLDER }} style={styles.avatarLarge} />
          <AppText variant="display2" style={{ textAlign: 'center' }}>{visiter.name}</AppText>
          <AppText variant="body" color={colors.textMuted} style={{ marginTop: 2, marginBottom: 14 }}>{visiter.profession_title}</AppText>
          <View style={styles.badgeContainer}>
            <Chip label="Identidad verificada" icon="shield-checkmark" tone="leaf" />
            <Chip label="Especialista felino" icon="paw" tone="brand" />
          </View>
        </View>

        <View style={styles.divider} />

        <AppText variant="title" style={styles.sectionTitle}>Métricas de servicio</AppText>
        <View style={styles.metricsGrid}>
          {metrics.map(m => (
            <View key={m.lab} style={styles.metricBox}>
              <Ionicons name={m.icon} size={20} color={colors.primary} />
              <AppText variant="title" style={{ fontSize: 18, marginTop: 6 }}>{m.val}</AppText>
              <AppText variant="small" color={colors.textMuted}>{m.lab}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <AppText variant="title" style={styles.sectionTitle}>Sobre mí</AppText>
        <AppText variant="body" color={colors.textMain} style={{ marginHorizontal: 24, lineHeight: 24, opacity: 0.9 }}>{visiter.bio}</AppText>

        <View style={styles.divider} />

        <AppText variant="title" style={styles.sectionTitle}>Reseñas {reviews.length > 0 ? `(${reviews.length})` : ''}</AppText>
        {reviews.length > 0 ? (
          <View style={{ marginHorizontal: 24 }}>
            {reviews.map(r => (
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
            ))}
          </View>
        ) : (
          <View style={styles.noReviews}><AppText variant="small" color={colors.textMuted}>Sin reseñas aún — ¡sé el primero!</AppText></View>
        )}
      </ScrollView>

      <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
        <View style={styles.footerContainer}>
          <View style={styles.priceContainer}>
            <AppText variant="display2" style={{ fontSize: 23 }}>${visiter.price_per_visit.toLocaleString('es-CL')}</AppText>
            <AppText variant="small" color={colors.textMuted}> /visita</AppText>
          </View>
          <Button label="Agendar visita" icon="calendar" onPress={() => navigation.navigate('Checkout', { id: visiter.id, type: 'visiter' })} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.surface },
  topBar: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, alignSelf: 'flex-start' },
  scrollContent: { paddingBottom: 110 },
  headerProfile: { alignItems: 'center', padding: 24, paddingTop: 20 },
  avatarLarge: { width: 116, height: 116, borderRadius: 38, marginBottom: 14, borderWidth: 3, borderColor: colors.surface, backgroundColor: colors.surfaceAlt },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 24, marginVertical: 20 },
  sectionTitle: { marginHorizontal: 24, marginBottom: 14 },
  metricsGrid: { flexDirection: 'row', marginHorizontal: 20, gap: 12 },
  metricBox: { flex: 1, backgroundColor: colors.surfaceAlt, padding: 16, borderRadius: radii.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  reviewCard: { backgroundColor: colors.background, borderRadius: radii.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noReviews: { marginHorizontal: 24, paddingVertical: 20, alignItems: 'center', backgroundColor: colors.background, borderRadius: radii.md },
  footerSafeArea: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  footerContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
});
