import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
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
        const [rv, stats] = await Promise.all([
          getHostReviews(v.host_id),
          getHostStats(v.host_id),
        ]);
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!visiter) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: 12 }}>
      <Text style={{ fontSize: 48 }}>🐾</Text>
      <Text style={{ color: colors.textMuted, fontSize: 16 }}>Cuidador no encontrado</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>← Volver</Text>
      </TouchableOpacity>
    </View>
  );

  const displayRating = avgRating > 0 ? avgRating : visiter.rating;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Atrás</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerProfile}>
          <Image
            source={{ uri: visiter.image_url ?? PLACEHOLDER }}
            style={styles.avatarLarge}
          />
          <Text style={styles.name}>{visiter.name}</Text>
          <Text style={styles.profession}>{visiter.profession_title}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}><Text style={styles.badgeText}>✓ Verificación de Identidad</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>✓ Especialista Felino</Text></View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Métricas de Servicio</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>⭐ {displayRating > 0 ? displayRating.toFixed(1) : '—'}</Text>
            <Text style={styles.metricLab}>Calificación</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>🐾 {visiter.total_visits}</Text>
            <Text style={styles.metricLab}>Visitas</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>💬 {reviews.length}</Text>
            <Text style={styles.metricLab}>Reseñas</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Sobre mí</Text>
        <Text style={styles.bioText}>{visiter.bio}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>
          Reseñas {reviews.length > 0 ? `(${reviews.length})` : ''}
        </Text>
        {reviews.length > 0 ? (
          <View style={{ marginHorizontal: 24 }}>
            {reviews.map(r => (
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
            ))}
          </View>
        ) : (
          <View style={styles.noReviews}>
            <Text style={styles.noReviewsText}>Sin reseñas aún — ¡sé el primero!</Text>
          </View>
        )}
      </ScrollView>

      <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
        <View style={styles.footerContainer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceValue}>${visiter.price_per_visit.toLocaleString('es-CL')}</Text>
            <Text style={styles.priceNight}> / visita</Text>
          </View>
          <TouchableOpacity
            style={styles.bookButton} activeOpacity={0.8}
            onPress={() => navigation.navigate('Checkout', { id: visiter.id, type: 'visiter' })}
          >
            <Text style={styles.bookButtonText}>Agendar Visita</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topBar: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { paddingVertical: 4, alignSelf: 'flex-start' },
  backButtonText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  scrollContent: { paddingBottom: 110 },
  headerProfile: { alignItems: 'center', padding: 24, paddingTop: 20 },
  avatarLarge: { width: 120, height: 120, borderRadius: 60, marginBottom: 16, borderWidth: 3, borderColor: colors.border },
  name: { fontSize: 26, fontWeight: '800', color: colors.textMain, marginBottom: 4 },
  profession: { fontSize: 16, color: colors.textMuted, marginBottom: 16 },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  badge: { backgroundColor: `${colors.primary}10`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: `${colors.primary}20` },
  badgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 24, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain, marginHorizontal: 24, marginBottom: 16 },
  metricsGrid: { flexDirection: 'row', marginHorizontal: 20, gap: 12 },
  metricBox: { flex: 1, backgroundColor: colors.background, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  metricVal: { fontSize: 16, fontWeight: '800', color: colors.textMain, marginBottom: 4 },
  metricLab: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  bioText: { marginHorizontal: 24, fontSize: 15, lineHeight: 24, color: colors.textMain, opacity: 0.85 },
  reviewCard: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  reviewStars: { fontSize: 12 },
  reviewComment: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 4 },
  reviewDate: { fontSize: 11, color: colors.textMuted },
  noReviews: { marginHorizontal: 24, paddingVertical: 20, alignItems: 'center', backgroundColor: colors.background, borderRadius: 12 },
  noReviewsText: { fontSize: 14, color: colors.textMuted },
  footerSafeArea: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  footerContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center', justifyContent: 'space-between' },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  priceValue: { fontSize: 22, fontWeight: '800', color: colors.textMain },
  priceNight: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  bookButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  bookButtonText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
