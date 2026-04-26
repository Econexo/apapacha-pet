import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Booking, Space, Visiter } from '../types/database';
import { getMyHostBookings } from '../services/host.service';
import { useAuth } from '../context/AuthContext';
import { getMySpace } from '../services/spaces.service';
import { getMyVisiter } from '../services/visiters.service';
import {
  getHostStats, getHostReviews, getMonthlyEarnings,
  getProgressToNextLevel,
  type HostStats, type Review, type MonthlyEarning,
} from '../services/reviews.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'resumen' | 'historial' | 'ganancias' | 'resenas';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 140;

const fmt     = (n: number) => `$${n.toLocaleString('es-CL')}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

export function HostDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const hostId = session?.user.id ?? '';

  const [tab, setTab]           = useState<Tab>('resumen');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats]       = useState<HostStats | null>(null);
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [earnings, setEarnings] = useState<MonthlyEarning[]>([]);
  const [mySpace, setMySpace]   = useState<Space | null | undefined>(undefined);
  const [myVisiter, setMyVisiter] = useState<Visiter | null | undefined>(undefined);
  const [loading, setLoading]   = useState(true);

  const reload = () => {
    if (!hostId) return;
    Promise.all([
      getMyHostBookings(),
      getHostStats(hostId),
      getHostReviews(hostId),
      getMonthlyEarnings(hostId),
      getMySpace(),
      getMyVisiter(),
    ]).then(([b, s, r, e, sp, vi]) => {
      setBookings(b);
      setStats(s);
      setReviews(r);
      setEarnings(e);
      setMySpace(sp);
      setMyVisiter(vi);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [hostId]);

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const activeBookings    = bookings.filter(b => b.status === 'active' || b.status === 'pending');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'resumen',   label: 'Resumen' },
    { key: 'historial', label: 'Historial' },
    { key: 'ganancias', label: 'Ganancias' },
    { key: 'resenas',   label: 'Reseñas' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel de Cuidador</Text>
        <TouchableOpacity style={styles.exitBtn} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.exitBtnText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {tab === 'resumen'   && <TabResumen   stats={stats} activeCount={activeBookings.length} completedCount={completedBookings.length} mySpace={mySpace ?? null} myVisiter={myVisiter ?? null} navigation={navigation} />}
          {tab === 'historial' && <TabHistorial bookings={completedBookings} />}
          {tab === 'ganancias' && <TabGanancias earnings={earnings} />}
          {tab === 'resenas'   && <TabResenas   reviews={reviews} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ─── TAB: RESUMEN ─────────────────────────────────────────────────────────── */

function TabResumen({ stats, activeCount, completedCount, mySpace, myVisiter, navigation }: {
  stats: HostStats | null;
  activeCount: number;
  completedCount: number;
  mySpace: Space | null;
  myVisiter: Visiter | null;
  navigation: Nav;
}) {
  if (!stats) return null;
  const { level, avgRating, totalTips, totalPoints } = stats;
  const progress = getProgressToNextLevel(totalPoints);

  return (
    <>
      {/* Level card */}
      <View style={[styles.levelCard, { borderColor: level.color }]}>
        <View style={styles.levelRow}>
          <Text style={styles.levelEmoji}>{level.emoji}</Text>
          <View style={styles.levelInfo}>
            <Text style={[styles.levelName, { color: level.color }]}>{level.name}</Text>
            <Text style={styles.levelPoints}>{totalPoints} puntos acumulados</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: level.color }]} />
        </View>
        {level.next !== null && (
          <Text style={styles.progressLabel}>
            {totalPoints} / {level.next} pts para el siguiente nivel
          </Text>
        )}
        {level.next === null && (
          <Text style={[styles.progressLabel, { color: level.color, fontWeight: '700' }]}>
            ¡Nivel máximo alcanzado! 🏆
          </Text>
        )}
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>Activas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completadas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            {avgRating > 0 ? avgRating.toFixed(1) : '–'}
          </Text>
          <Text style={styles.statLabel}>Calif. media</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.accent, fontSize: 18 }]}>
            {fmt(totalTips)}
          </Text>
          <Text style={styles.statLabel}>Propinas</Text>
        </View>
      </View>

      {/* Points explanation */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>¿Cómo se acumulan los puntos?</Text>
        <Text style={styles.infoText}>⭐ Cada estrella de una reseña = 1 punto</Text>
        <Text style={styles.infoText}>💝 Cada $1.000 de propina = 1 punto</Text>
        <Text style={styles.infoText}>📈 Más puntos = mayor nivel = más confianza</Text>
      </View>

      {/* My service listings */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Mis Servicios</Text>
      <ServiceCard
        label="🏠 Alojamiento"
        service={mySpace}
        price={mySpace ? `$${mySpace.price_per_night.toLocaleString('es-CL')}/noche` : null}
        onManage={() => navigation.navigate('ManageService', { type: 'space' })}
      />
      <ServiceCard
        label="🚗 Visita domiciliaria"
        service={myVisiter}
        price={myVisiter ? `$${myVisiter.price_per_visit.toLocaleString('es-CL')}/visita` : null}
        onManage={() => navigation.navigate('ManageService', { type: 'visiter' })}
      />
    </>
  );
}

function ServiceCard({ label, service, price, onManage }: {
  label: string;
  service: Space | Visiter | null;
  price: string | null;
  onManage: () => void;
}) {
  const hasService = service !== null;
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceCardLeft}>
        <Text style={styles.serviceCardLabel}>{label}</Text>
        {hasService ? (
          <>
            <Text style={styles.serviceCardTitle} numberOfLines={1}>
              {'title' in service ? service.title : service.name}
            </Text>
            <View style={styles.serviceCardMeta}>
              <View style={[styles.serviceActiveDot, { backgroundColor: service.active ? colors.accent : colors.textMuted }]} />
              <Text style={styles.serviceCardSub}>{service.active ? 'Activo' : 'Pausado'} · {price}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.serviceCardEmpty}>Sin publicación aún</Text>
        )}
      </View>
      <TouchableOpacity style={styles.serviceManageBtn} onPress={onManage} activeOpacity={0.8}>
        <Text style={styles.serviceManageBtnText}>{hasService ? 'Editar' : 'Crear'}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── TAB: HISTORIAL ───────────────────────────────────────────────────────── */

function TabHistorial({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>Sin cuidados completados</Text>
        <Text style={styles.emptyText}>Aquí verás el historial de todos los cuidados que hayas realizado.</Text>
      </View>
    );
  }
  return (
    <>
      <Text style={styles.sectionTitle}>Historial de cuidados ({bookings.length})</Text>
      {bookings.map(b => (
        <View key={b.id} style={styles.histCard}>
          <View style={styles.histHeader}>
            <Text style={styles.histService}>{b.service_type === 'space' ? '🏠 Alojamiento' : '🚗 Visita domiciliaria'}</Text>
            <Text style={[styles.histBadge, { color: colors.accent, backgroundColor: colors.successBg }]}>Completada</Text>
          </View>
          <Text style={styles.histDates}>{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</Text>
          <View style={styles.histFooter}>
            <Text style={styles.histPrice}>{fmt(b.total_price)}</Text>
            <Text style={styles.histPaid}>{b.payment_status === 'paid' ? '💰 Pagado' : '⏳ Pendiente'}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

/* ─── TAB: GANANCIAS ───────────────────────────────────────────────────────── */

function TabGanancias({ earnings }: { earnings: MonthlyEarning[] }) {
  if (earnings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>Sin datos aún</Text>
        <Text style={styles.emptyText}>Aquí verás tus ganancias mensuales una vez que completes reservas.</Text>
      </View>
    );
  }

  const maxEarnings = Math.max(...earnings.map(e => e.earnings), 1);
  const totalAll    = earnings.reduce((s, e) => s + e.earnings, 0);
  const totalCares  = earnings.reduce((s, e) => s + e.cares, 0);

  return (
    <>
      <Text style={styles.sectionTitle}>Últimos 6 meses</Text>

      {/* Summary */}
      <View style={styles.earningsSummary}>
        <View style={styles.earningsSummaryItem}>
          <Text style={styles.earningsSummaryNumber}>{fmt(totalAll)}</Text>
          <Text style={styles.earningsSummaryLabel}>Total ganancias</Text>
        </View>
        <View style={styles.earningsSummaryDivider} />
        <View style={styles.earningsSummaryItem}>
          <Text style={styles.earningsSummaryNumber}>{totalCares}</Text>
          <Text style={styles.earningsSummaryLabel}>Total cuidados</Text>
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.chart}>
        {earnings.map((e, i) => {
          const barH = Math.max((e.earnings / maxEarnings) * CHART_HEIGHT, 4);
          return (
            <View key={i} style={styles.chartColumn}>
              <Text style={styles.chartValue}>{e.earnings > 0 ? fmt(e.earnings) : ''}</Text>
              <View style={styles.chartBarContainer}>
                <View style={[styles.chartBar, { height: barH }]} />
              </View>
              <Text style={styles.chartMonth}>{e.month}</Text>
              <Text style={styles.chartCares}>{e.cares > 0 ? `${e.cares} ♡` : ''}</Text>
            </View>
          );
        })}
      </View>

      {/* Monthly detail */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Detalle mensual</Text>
      {[...earnings].reverse().map((e, i) => (
        <View key={i} style={styles.monthRow}>
          <View>
            <Text style={styles.monthLabel}>{e.month} {e.year}</Text>
            <Text style={styles.monthCares}>{e.cares} cuidado{e.cares !== 1 ? 's' : ''}</Text>
          </View>
          <Text style={styles.monthEarning}>{fmt(e.earnings)}</Text>
        </View>
      ))}
    </>
  );
}

/* ─── TAB: RESEÑAS ─────────────────────────────────────────────────────────── */

function TabResenas({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>⭐</Text>
        <Text style={styles.emptyTitle}>Sin reseñas aún</Text>
        <Text style={styles.emptyText}>Las reseñas de tus clientes aparecerán aquí.</Text>
      </View>
    );
  }

  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <>
      <View style={styles.reviewsHeader}>
        <Text style={styles.reviewsAvgNumber}>{avg}</Text>
        <Text style={styles.reviewsAvgStars}>{'★'.repeat(Math.round(Number(avg)))}</Text>
        <Text style={styles.reviewsCount}>{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</Text>
      </View>

      {reviews.map(r => (
        <View key={r.id} style={styles.reviewCard}>
          <View style={styles.reviewCardHeader}>
            <View>
              <Text style={styles.reviewerName}>{r.reviewer_name ?? 'Cliente'}</Text>
              {r.booking_start && (
                <Text style={styles.reviewDate}>
                  {fmtDate(r.booking_start)}
                  {r.booking_service_type === 'space' ? ' · 🏠 Alojamiento' : ' · 🚗 Visita'}
                </Text>
              )}
            </View>
            <View style={styles.reviewStarsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Text key={s} style={[styles.reviewStar, { color: s <= r.rating ? '#F59E0B' : colors.border }]}>★</Text>
              ))}
            </View>
          </View>
          {r.comment ? (
            <Text style={styles.reviewComment}>"{r.comment}"</Text>
          ) : null}
          {r.tip_amount > 0 && (
            <View style={styles.reviewTip}>
              <Text style={styles.reviewTipText}>💝 Propina: {fmt(r.tip_amount)}</Text>
            </View>
          )}
        </View>
      ))}
    </>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, backgroundColor: colors.surface },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textMain },
  exitBtn: { padding: 8, backgroundColor: colors.dangerBg, borderRadius: 8 },
  exitBtnText: { color: colors.danger, fontWeight: '700', fontSize: 13 },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.primary, fontWeight: '800' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { padding: 20, paddingBottom: 80 },

  // Level card
  levelCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 2, marginBottom: 20 },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  levelEmoji: { fontSize: 48, marginRight: 16 },
  levelInfo: { flex: 1 },
  levelName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  levelPoints: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  progressBarBg: { height: 10, backgroundColor: colors.border, borderRadius: 8, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: 10, borderRadius: 8 },
  progressLabel: { fontSize: 12, color: colors.textMuted, textAlign: 'right' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: (SCREEN_WIDTH - 40 - 12) / 2 - 0.5, backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },

  // Info box
  infoBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, gap: 6 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: colors.primaryDark, marginBottom: 4 },
  infoText: { fontSize: 13, color: colors.primaryDark },

  // Section
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textMain, marginBottom: 16 },

  // Historial
  histCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  histService: { fontSize: 15, fontWeight: '700', color: colors.textMain },
  histBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  histDates: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  histFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histPrice: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  histPaid: { fontSize: 13, color: colors.textMuted },

  // Earnings summary
  earningsSummary: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
  earningsSummaryItem: { flex: 1, alignItems: 'center' },
  earningsSummaryNumber: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  earningsSummaryLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  earningsSummaryDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 8 },

  // Bar chart
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border, height: CHART_HEIGHT + 80 },
  chartColumn: { flex: 1, alignItems: 'center' },
  chartValue: { fontSize: 9, color: colors.textMuted, textAlign: 'center', marginBottom: 2, minHeight: 12 },
  chartBarContainer: { width: '60%', height: CHART_HEIGHT, justifyContent: 'flex-end' },
  chartBar: { width: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  chartMonth: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 6 },
  chartCares: { fontSize: 9, color: colors.accent, marginTop: 2, minHeight: 12 },

  // Monthly rows
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  monthCares: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  monthEarning: { fontSize: 16, fontWeight: '800', color: colors.primary },

  // Reviews
  reviewsHeader: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  reviewsAvgNumber: { fontSize: 48, fontWeight: '800', color: colors.textMain },
  reviewsAvgStars: { fontSize: 24, color: '#F59E0B', marginTop: 4 },
  reviewsCount: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  reviewCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  reviewDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  reviewStarsRow: { flexDirection: 'row', gap: 2 },
  reviewStar: { fontSize: 18 },
  reviewComment: { fontSize: 14, color: colors.textMain, lineHeight: 20, fontStyle: 'italic', marginBottom: 8 },
  reviewTip: { backgroundColor: `${colors.primary}10`, borderRadius: 8, padding: 8, alignSelf: 'flex-start' },
  reviewTipText: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },

  // Service cards
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  serviceCardLeft: { flex: 1 },
  serviceCardLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  serviceCardTitle: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  serviceCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceActiveDot: { width: 7, height: 7, borderRadius: 4 },
  serviceCardSub: { fontSize: 12, color: colors.textMuted },
  serviceCardEmpty: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  serviceManageBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  serviceManageBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
