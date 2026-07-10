import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { radii, shadows, label } from '../theme/design';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../types/navigation';
import type { Booking, Space, Visiter } from '../types/database';
import { getMyHostBookings } from '../services/host.service';
import { supabase } from '../../supabase';
import { useAuth } from '../context/AuthContext';
import { getMySpace } from '../services/spaces.service';
import { getMyVisiters, deleteMyVisiter } from '../services/visiters.service';
import {
  getHostStats, getHostReviews, getMonthlyEarnings,
  getProgressToNextLevel,
  type HostStats, type Review, type MonthlyEarning,
} from '../services/reviews.service';
import { completeBookingAsHost, startService } from '../services/host.service';
import { OverlayModal } from '../components/OverlayModal';
import { ManageServiceScreen } from './ManageServiceScreen';
import { useToast } from '../components/Toast';
import { useCountUp } from '../hooks/useCountUp';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'servicios' | 'resumen' | 'solicitudes' | 'historial' | 'ganancias' | 'resenas';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 140;

const fmt     = (n: number) => `$${n.toLocaleString('es-CL')}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

export function HostDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const hostId = session?.user.id ?? '';

  const [tab, setTab]           = useState<Tab>('servicios');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats]       = useState<HostStats | null>(null);
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [earnings, setEarnings] = useState<MonthlyEarning[]>([]);
  const [mySpace, setMySpace]     = useState<Space | null | undefined>(undefined);
  const [myVisiters, setMyVisiters] = useState<Visiter[]>([]);
  const [loading, setLoading]   = useState(true);
  const [manageModal, setManageModal] = useState<{ type: 'space' | 'visiter'; serviceId?: string } | null>(null);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const reload = async () => {
    if (!hostId) { setLoading(false); return; }
    const settle = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
      p.catch((e) => { console.warn('Dashboard load partial fail:', e); return fallback; });
    const [b, r, e, sp, vi] = await Promise.all([
      settle(getMyHostBookings(), []),
      settle(getHostReviews(hostId), []),
      settle(getMonthlyEarnings(hostId), []),
      settle(getMySpace(), null),
      settle(getMyVisiters(), []),
    ]);
    const s = await settle(getHostStats(hostId, r), null);
    setBookings(b);
    if (s) setStats(s);
    setReviews(r);
    setEarnings(e);
    setMySpace(sp);
    setMyVisiters(vi);
    setLoading(false);

    // Nombres de clientes + reservas que ya reseñé (para "Calificar cliente")
    const ownerIds = [...new Set(b.filter(bk => bk.status === 'completed').map(bk => bk.owner_id).filter(Boolean))];
    const [ownersRes, myReviewsRes] = await Promise.all([
      ownerIds.length
        ? supabase.from('public_profiles').select('id, full_name, last_name').in('id', ownerIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from('reviews').select('booking_id').eq('reviewer_id', hostId),
    ]);
    const cMap: Record<string, string> = {};
    for (const p of (ownersRes.data ?? [])) cMap[p.id] = `${p.full_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Cliente';
    setClientMap(cMap);
    setReviewedIds(new Set((myReviewsRes.data ?? []).map((r: any) => r.booking_id)));
  };

  useEffect(() => { reload(); }, [hostId]);

  // Refresh services when returning from ManageService modal
  useFocusEffect(useCallback(() => {
    if (!hostId) return;
    getMySpace().then(setMySpace).catch(e => console.error('[HostDashboard] getMySpace:', e));
    getMyVisiters().then(setMyVisiters).catch(e => console.error('[HostDashboard] getMyVisiters:', e));
  }, [hostId]));

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const activeBookings    = bookings.filter(b => b.status === 'active' || b.status === 'pending');

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'servicios',   label: 'Servicios' },
    { key: 'resumen',     label: 'Resumen' },
    { key: 'solicitudes', label: 'Solicitudes', badge: activeBookings.length },
    { key: 'historial',   label: 'Historial' },
    { key: 'ganancias',   label: 'Ganancias' },
    { key: 'resenas',     label: 'Reseñas' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Panel</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
                {!!t.badge && t.badge > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{t.badge}</Text>
                  </View>
                )}
              </View>
              {tab === t.key && <View style={styles.tabActiveBar} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.tabDivider} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {tab === 'servicios'   && <TabServicios mySpace={mySpace ?? null} myVisiters={myVisiters} navigation={navigation} onReload={reload} onManageService={setManageModal} />}
          {tab === 'resumen'     && <TabResumen   stats={stats} activeCount={activeBookings.length} completedCount={completedBookings.length} mySpace={mySpace ?? null} myVisiter={myVisiters[0] ?? null} navigation={navigation} onManageService={setManageModal} />}
          {tab === 'solicitudes' && <TabSolicitudes bookings={activeBookings} navigation={navigation} onReload={reload} />}
          {tab === 'historial'   && <TabHistorial completedBookings={completedBookings} clientMap={clientMap} reviewedIds={reviewedIds} navigation={navigation} />}
          {tab === 'ganancias'   && <TabGanancias earnings={earnings} />}
          {tab === 'resenas'     && <TabResenas   reviews={reviews} />}
        </ScrollView>
      )}
      {manageModal && (
        <OverlayModal visible={!!manageModal} onClose={() => setManageModal(null)}>
          <ManageServiceScreen
            type={manageModal.type}
            serviceId={manageModal.serviceId}
            onClose={() => {
              setManageModal(null);
              reload();
            }}
          />
        </OverlayModal>
      )}
    </SafeAreaView>
  );
}

/* ─── TAB: SERVICIOS ─────────────────────────────────────────────────────── */

function TabServicios({ mySpace, myVisiters, navigation, onReload, onManageService }: {
  mySpace: Space | null;
  myVisiters: Visiter[];
  navigation: Nav;
  onReload: () => void;
  onManageService: (params: { type: 'space' | 'visiter'; serviceId?: string }) => void;
}) {
  const toast = useToast();
  const handleDeleteVisiter = (v: Visiter) => {
    const doDelete = async () => {
      try {
        await deleteMyVisiter(v.id);
        onReload();
      } catch (e: any) {
        toast.error('Error', e.message ?? 'No se pudo eliminar');
      }
    };
    if (Platform.OS === 'web') {
      if ((window as any).confirm(`¿Eliminar "${v.name}"? Esta acción no se puede deshacer.`)) doDelete();
    } else {
      Alert.alert('Eliminar publicación', `¿Eliminar "${v.name}"?\nEsta acción no se puede deshacer.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <>
      <View style={styles.serviciosIntro}>
        <Text style={styles.serviciosTitle}>Mis publicaciones</Text>
        <Text style={styles.serviciosSubtitle}>
          Aquí gestionas los servicios que los dueños pueden reservar.
          Puedes tener un Alojamiento y varias Visitas activas al mismo tiempo.
        </Text>
      </View>

      {/* Alojamiento */}
      <View style={styles.servicioBlock}>
        <View style={styles.servicioBlockHeader}>
          <Text style={styles.servicioBlockIcon}>🏠</Text>
          <View style={styles.servicioBlockInfo}>
            <Text style={styles.servicioBlockType}>Hospedaje Catificado</Text>
            <Text style={styles.servicioBlockDesc}>Alojas gatos en tu propio hogar</Text>
          </View>
          {mySpace && (
            <View style={[styles.statusPill, mySpace.active ? styles.statusPillActive : styles.statusPillPaused]}>
              <Text style={[styles.statusPillText, mySpace.active ? styles.statusPillTextActive : styles.statusPillTextPaused]}>
                {mySpace.active ? 'Activo' : 'Pausado'}
              </Text>
            </View>
          )}
        </View>

        {mySpace ? (
          <View style={styles.servicioDetail}>
            <Text style={styles.servicioDetailTitle} numberOfLines={2}>{mySpace.title}</Text>
            <View style={styles.servicioDetailRow}>
              <Text style={styles.servicioDetailLabel}>📍 Sector</Text>
              <Text style={styles.servicioDetailValue}>{mySpace.location}</Text>
            </View>
            <View style={styles.servicioDetailRow}>
              <Text style={styles.servicioDetailLabel}>💰 Tarifa</Text>
              <Text style={styles.servicioDetailValue}>${mySpace.price_per_night.toLocaleString('es-CL')} / noche</Text>
            </View>
            {mySpace.features.length > 0 && (
              <View style={styles.featuresRow}>
                {mySpace.features.slice(0, 3).map(f => (
                  <View key={f} style={styles.featurePill}>
                    <Text style={styles.featurePillText}>{f}</Text>
                  </View>
                ))}
                {mySpace.features.length > 3 && (
                  <Text style={styles.featureMore}>+{mySpace.features.length - 3}</Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.servicioEmpty}>
            <Text style={styles.servicioEmptyText}>Sin publicación · Los dueños no te pueden encontrar aún</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.servicioBtn, mySpace ? styles.servicioBtnEdit : styles.servicioBtnCreate]}
          onPress={() => onManageService({ type: 'space' })}
          activeOpacity={0.8}
        >
          <Text style={[styles.servicioBtnText, mySpace ? styles.servicioBtnTextEdit : styles.servicioBtnTextCreate]}>
            {mySpace ? '✏️  Editar publicación' : '＋  Crear publicación de Alojamiento'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Visitas domiciliarias */}
      <View style={styles.servicioBlock}>
        <View style={styles.servicioBlockHeader}>
          <Text style={styles.servicioBlockIcon}>🚗</Text>
          <View style={styles.servicioBlockInfo}>
            <Text style={styles.servicioBlockType}>Visitas Domiciliarias</Text>
            <Text style={styles.servicioBlockDesc}>Visitas en el hogar del dueño</Text>
          </View>
        </View>

        {myVisiters.length === 0 ? (
          <View style={styles.servicioEmpty}>
            <Text style={styles.servicioEmptyText}>Sin publicaciones · Los dueños no te pueden encontrar aún</Text>
          </View>
        ) : (
          myVisiters.map(v => (
            <View key={v.id} style={styles.servicioDetail}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.servicioDetailTitle, { flex: 1 }]} numberOfLines={1}>{v.name}</Text>
                <View style={[styles.statusPill, v.active ? styles.statusPillActive : styles.statusPillPaused]}>
                  <Text style={[styles.statusPillText, v.active ? styles.statusPillTextActive : styles.statusPillTextPaused]}>
                    {v.active ? 'Activo' : 'Pausado'}
                  </Text>
                </View>
              </View>
              <View style={styles.servicioDetailRow}>
                <Text style={styles.servicioDetailLabel}>🎓 Título</Text>
                <Text style={styles.servicioDetailValue}>{v.profession_title}</Text>
              </View>
              <View style={styles.servicioDetailRow}>
                <Text style={styles.servicioDetailLabel}>💰 Tarifa</Text>
                <Text style={styles.servicioDetailValue}>${v.price_per_visit.toLocaleString('es-CL')} / visita</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.servicioBtn, styles.servicioBtnEdit, { flex: 1, paddingVertical: 9 }]}
                  onPress={() => onManageService({ type: 'visiter', serviceId: v.id })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.servicioBtnText, styles.servicioBtnTextEdit]}>✏️  Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.servicioBtn, { flex: 1, paddingVertical: 9, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' }]}
                  onPress={() => handleDeleteVisiter(v)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.servicioBtnText, { color: '#DC2626' }]}>🗑  Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.servicioBtn, styles.servicioBtnCreate, { marginTop: myVisiters.length > 0 ? 8 : 0 }]}
          onPress={() => onManageService({ type: 'visiter' })}
          activeOpacity={0.8}
        >
          <Text style={[styles.servicioBtnText, styles.servicioBtnTextCreate]}>
            ＋  Nueva publicación de Visita
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.serviciosHint}>
        <Text style={styles.serviciosHintText}>
          💡 Puedes tener ambos servicios activos. Cada publicación aparece en el tab "Explorar" para que los dueños te encuentren.
        </Text>
      </View>
    </>
  );
}

/* ─── TAB: RESUMEN ─────────────────────────────────────────────────────────── */

function TabResumen({ stats, activeCount, completedCount, mySpace, myVisiter, navigation, onManageService }: {
  stats: HostStats | null;
  activeCount: number;
  completedCount: number;
  mySpace: Space | null;
  myVisiter: Visiter | null;
  navigation: Nav;
  onManageService: (params: { type: 'space' | 'visiter'; serviceId?: string }) => void;
}) {
  if (!stats) return (
    <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
      <Text style={{ fontSize: 32 }}>📊</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>No se pudieron cargar las estadísticas.</Text>
    </View>
  );
  const { level, avgRating, totalTips, totalPoints } = stats;
  const progress = getProgressToNextLevel(totalPoints);
  const animPoints = useCountUp(totalPoints);
  const animTips = useCountUp(totalTips);
  const animCompleted = useCountUp(completedCount);
  const animActive = useCountUp(activeCount);

  return (
    <>
      {/* Level card */}
      <View style={[styles.levelCard, { borderColor: level.color }]}>
        <View style={styles.levelRow}>
          <Text style={styles.levelEmoji}>{level.emoji}</Text>
          <View style={styles.levelInfo}>
            <Text style={[styles.levelName, { color: level.color }]}>{level.name}</Text>
            <Text style={styles.levelPoints}>{animPoints.toLocaleString('es-CL')} puntos acumulados</Text>
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
          <Text style={styles.statNumber}>{animActive}</Text>
          <Text style={styles.statLabel}>Activas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{animCompleted}</Text>
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
            ${animTips.toLocaleString('es-CL')}
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
        onManage={() => onManageService({ type: 'space' })}
      />
      <ServiceCard
        label="🚗 Visita domiciliaria"
        service={myVisiter}
        price={myVisiter ? `$${myVisiter.price_per_visit.toLocaleString('es-CL')}/visita` : null}
        onManage={() => onManageService({ type: 'visiter' })}
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

/* ─── HELPERS ───────────────────────────────────────────────────────────────── */

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function daysFromToday(date: string) {
  return daysBetween(new Date().toISOString().slice(0, 10), date);
}

/* ─── SERVICE FLOW STEPPER ──────────────────────────────────────────────────── */

type FlowStep = { label: string; sublabel?: string; done: boolean; active: boolean };

function getFlowSteps(b: Booking): FlowStep[] {
  const isPending   = b.status === 'pending';
  const isActive    = b.status === 'active';
  const isInProgress = b.service_phase === 'in_progress';
  const isDone      = b.status === 'completed';

  return [
    {
      label: 'Reservada',
      sublabel: fmtDate(b.created_at),
      done: true,
      active: isPending,
    },
    {
      label: 'Confirmada',
      sublabel: isActive || isDone ? fmtDate(b.start_date) : undefined,
      done: isActive || isDone,
      active: isActive && !isInProgress && !isDone,
    },
    {
      label: 'En curso',
      done: isInProgress || isDone,
      active: isInProgress,
    },
    {
      label: 'Finalizada',
      sublabel: isDone ? fmtDate(b.end_date) : undefined,
      done: isDone,
      active: isDone,
    },
  ];
}

function FlowStepper({ booking, onStart, onComplete }: {
  booking: Booking;
  onStart?: () => void;
  onComplete?: () => void;
}) {
  const steps = getFlowSteps(booking);

  const canStart    = booking.status === 'active' && booking.service_phase === 'not_started';
  const canComplete = booking.status === 'active' && booking.service_phase === 'in_progress';

  return (
    <View style={styles.flowContainer}>
      {/* Dots + lines */}
      <View style={styles.flowWrapper}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <View style={styles.flowStepCol}>
              <View style={[
                styles.flowDot,
                s.done   && styles.flowDotDone,
                s.active && styles.flowDotActive,
              ]}>
                {s.done
                  ? <Text style={styles.flowDotCheck}>✓</Text>
                  : <Text style={styles.flowDotNum}>{i + 1}</Text>
                }
              </View>
              <Text style={[
                styles.flowLabel,
                s.active && styles.flowLabelActive,
                s.done && !s.active && styles.flowLabelDone,
              ]}>
                {s.label}
              </Text>
              {s.sublabel
                ? <Text style={styles.flowSublabel}>{s.sublabel}</Text>
                : <Text style={styles.flowSublabel}> </Text>
              }
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.flowLine, steps[i + 1].done && styles.flowLineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Next-step action */}
      {canStart && (
        <TouchableOpacity style={styles.flowActionBtn} onPress={onStart} activeOpacity={0.8}>
          <Text style={styles.flowActionIcon}>🚀</Text>
          <View style={styles.flowActionText}>
            <Text style={styles.flowActionTitle}>Iniciar servicio</Text>
            <Text style={styles.flowActionSub}>Toca para marcar que el cuidado ha comenzado</Text>
          </View>
          <Text style={styles.flowActionArrow}>›</Text>
        </TouchableOpacity>
      )}
      {canComplete && (
        <TouchableOpacity style={[styles.flowActionBtn, styles.flowActionBtnGreen]} onPress={onComplete} activeOpacity={0.8}>
          <Text style={styles.flowActionIcon}>✅</Text>
          <View style={styles.flowActionText}>
            <Text style={[styles.flowActionTitle, { color: colors.successText }]}>Finalizar servicio</Text>
            <Text style={[styles.flowActionSub, { color: colors.successText }]}>Toca para marcar que el cuidado ha terminado</Text>
          </View>
          <Text style={[styles.flowActionArrow, { color: colors.successText }]}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ─── TAB: SOLICITUDES (activas / pendientes) ──────────────────────────────── */

function TabSolicitudes({ bookings, navigation, onReload }: {
  bookings: Booking[];
  navigation: Nav;
  onReload: () => void;
}) {
  if (bookings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconBox}>
          <Text style={styles.emptyEmoji}>📭</Text>
        </View>
        <Text style={styles.emptyTitle}>Sin solicitudes activas</Text>
        <Text style={styles.emptyText}>Cuando un dueño reserve tu servicio aparecerá aquí para que puedas gestionarlo.</Text>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Solicitudes activas ({bookings.length})</Text>
      {bookings.map(b => {
        const totalDays    = daysBetween(b.start_date, b.end_date);
        const isMultiDay   = totalDays > 1;
        const daysLeft     = daysFromToday(b.end_date);
        const daysPassed   = totalDays - daysLeft;
        const isPending    = b.status === 'pending';
        const isInProgress = b.service_phase === 'in_progress';

        const doStart = () => startService(b.id).then(onReload).catch(console.error);
        const doComplete = () => completeBookingAsHost(b.id).then(onReload).catch(console.error);
        const confirmStart = () => {
          if (Platform.OS === 'web') {
            if ((window as any).confirm('¿Confirmas que el servicio ha comenzado?')) doStart();
          } else {
            Alert.alert('Iniciar servicio', '¿Confirmas que el servicio ha comenzado?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Iniciar', onPress: doStart },
            ]);
          }
        };
        const confirmComplete = () => {
          if (Platform.OS === 'web') {
            if ((window as any).confirm('¿Confirmas que el cuidado ha finalizado?')) doComplete();
          } else {
            Alert.alert('Finalizar servicio', '¿Confirmas que el cuidado ha finalizado?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Finalizar', onPress: doComplete },
            ]);
          }
        };

        const borderColor = isPending ? colors.warning
          : isInProgress  ? colors.accent
          : colors.primary;

        return (
          <View key={b.id} style={[styles.histCard, { borderColor, borderWidth: 1.5 }]}>
            {/* Header */}
            <View style={styles.histHeader}>
              <Text style={styles.histService}>{b.service_type === 'space' ? '🏠 Alojamiento' : '🚗 Visita'}</Text>
              <Text style={[styles.histBadge, {
                color: isPending ? colors.warning : isInProgress ? colors.successText : colors.primaryDark,
                backgroundColor: isPending ? `${colors.warning}18` : isInProgress ? colors.successBg : colors.primaryLight,
              }]}>
                {isPending ? '🕐 Pendiente' : isInProgress ? '🟢 En curso' : '⏳ Por iniciar'}
              </Text>
            </View>

            {/* Fechas + duración */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={styles.histDates}>{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</Text>
              {isMultiDay && (
                <View style={styles.durationPill}>
                  <Text style={styles.durationPillText}>{totalDays} noches</Text>
                </View>
              )}
            </View>

            {/* Progreso multi-día en curso */}
            {isMultiDay && isInProgress && daysLeft >= 0 && (
              <View style={styles.multiDayBar}>
                <View style={styles.multiDayBarBg}>
                  <View style={[styles.multiDayBarFill, { width: `${Math.min(100, Math.round((daysPassed / totalDays) * 100))}%` as any }]} />
                </View>
                <Text style={styles.multiDayBarLabel}>
                  {daysLeft === 0 ? '¡Último día! Puedes finalizar.' : `Día ${Math.max(1, daysPassed + 1)} de ${totalDays} · Quedan ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
                </Text>
              </View>
            )}

            {/* Stepper de flujo */}
            <FlowStepper booking={b} onStart={confirmStart} onComplete={confirmComplete} />

            {/* Footer */}
            <View style={styles.histFooter}>
              <Text style={styles.histPrice}>{fmt(b.total_price)}</Text>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate('ChatDetail', { id: b.id })}
                activeOpacity={0.8}
              >
                <Text style={styles.chatBtnText}>💬 Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </>
  );
}

/* ─── TAB: HISTORIAL (solo completadas) ────────────────────────────────────── */

function TabHistorial({ completedBookings, clientMap, reviewedIds, navigation }: {
  completedBookings: Booking[];
  clientMap: Record<string, string>;
  reviewedIds: Set<string>;
  navigation: Nav;
}) {
  if (completedBookings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconBox}>
          <Text style={styles.emptyEmoji}>📋</Text>
        </View>
        <Text style={styles.emptyTitle}>Sin servicios completados</Text>
        <Text style={styles.emptyText}>Aquí aparecerán los servicios que hayas finalizado.</Text>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Servicios realizados ({completedBookings.length})</Text>
      {completedBookings.map(b => {
        const totalDays  = daysBetween(b.start_date, b.end_date);
        const isMultiDay = totalDays > 1;
        return (
          <View key={b.id} style={styles.histCard}>
            <View style={styles.histHeader}>
              <View>
                <Text style={styles.histService}>{b.service_type === 'space' ? '🏠 Alojamiento' : '🚗 Visita'}</Text>
                {isMultiDay && <Text style={styles.histDuracion}>{totalDays} noches</Text>}
              </View>
              <Text style={[styles.histBadge, { color: colors.successText, backgroundColor: colors.successBg }]}>✅ Finalizado</Text>
            </View>
            <Text style={styles.histDates}>{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</Text>
            <View style={styles.histFooter}>
              <Text style={styles.histPrice}>{fmt(b.total_price)}</Text>
              <Text style={styles.histPaid}>{b.payment_status === 'paid' ? '💰 Pagado' : '⏳ Pago pendiente'}</Text>
            </View>
            <View style={styles.histClientRow}>
              <Text style={styles.histClientName} numberOfLines={1}>👤 {clientMap[b.owner_id] ?? 'Cliente'}</Text>
              {reviewedIds.has(b.id) ? (
                <View style={styles.histReviewedTag}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.successText} />
                  <Text style={styles.histReviewedText}>Calificado</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.histRateBtn}
                  onPress={() => navigation.navigate('LeaveReview', {
                    bookingId: b.id,
                    hostId: b.owner_id,
                    hostName: clientMap[b.owner_id] ?? 'Cliente',
                    variant: 'client',
                  })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="star-outline" size={14} color={colors.primary} />
                  <Text style={styles.histRateText}>Calificar cliente</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </>
  );
}

/* ─── TAB: GANANCIAS ───────────────────────────────────────────────────────── */

function TabGanancias({ earnings }: { earnings: MonthlyEarning[] }) {
  const hasData = earnings.some(e => e.earnings > 0);

  if (earnings.length === 0 || !hasData) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconBox}>
          <Text style={styles.emptyEmoji}>📊</Text>
        </View>
        <Text style={styles.emptyTitle}>Sin ganancias aún</Text>
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
        <View style={styles.emptyIconBox}>
          <Text style={styles.emptyEmoji}>⭐</Text>
        </View>
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
  headerTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.textMain, letterSpacing: -0.3 },
  exitBtn: { padding: 8, backgroundColor: colors.dangerBg, borderRadius: 8 },
  exitBtnText: { color: colors.danger, fontWeight: '700', fontSize: 13 },

  // Tabs
  tabBarWrapper: { backgroundColor: colors.surface },
  tabBarContent: { flexGrow: 1, flexDirection: 'row' },
  tabItem: { flex: 1, minWidth: 80, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 10, alignItems: 'center' },
  tabLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  tabLabelActive: { color: colors.primary, fontWeight: '800' },
  tabActiveBar: { position: 'absolute', bottom: 0, left: 6, right: 6, height: 2.5, backgroundColor: colors.primary, borderRadius: 2 },
  tabDivider: { height: 1, backgroundColor: colors.border },
  tabBadge: { backgroundColor: colors.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { padding: 20, paddingBottom: 80 },

  // Level card
  levelCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 20, borderWidth: 2, marginBottom: 20, ...shadows.md },
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
  statCard: { width: (SCREEN_WIDTH - 40 - 12) / 2 - 0.5, backgroundColor: colors.surface, padding: 18, borderRadius: radii.lg, ...shadows.sm, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Info box
  infoBox: { backgroundColor: colors.primaryLight, borderRadius: radii.lg, padding: 16, gap: 6 },
  infoTitle: { fontSize: 13, fontWeight: '800', color: colors.primaryDark, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoText: { fontSize: 13, color: colors.primaryDark },

  // Section
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.textMain, marginBottom: 16, letterSpacing: -0.2 },

  // Historial
  histCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, marginBottom: 12, ...shadows.md },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  histService: { fontSize: 15, fontWeight: '700', color: colors.textMain },
  histBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  histDates: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  histFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histPrice: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  histPaid: { fontSize: 13, color: colors.textMuted },
  histClientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  histClientName: { fontSize: 13, color: colors.textMuted, fontWeight: '600', flexShrink: 1 },
  histRateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primaryLight, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 7 },
  histRateText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  histReviewedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successBg, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 7 },
  histReviewedText: { fontSize: 12, fontWeight: '700', color: colors.successText },
  histDuracion: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  durationPill: { backgroundColor: `${colors.primary}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  durationPillText: { fontSize: 11, color: colors.primaryDark, fontWeight: '700' },
  multiDayBar: { marginBottom: 8 },
  multiDayBarBg: { height: 6, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  multiDayBarFill: { height: 6, backgroundColor: colors.accent, borderRadius: 4 },
  multiDayBarLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  chatBtn: { backgroundColor: `${colors.primary}15`, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: `${colors.primary}30` },
  chatBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  startBtn: { backgroundColor: `${colors.primary}15`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: `${colors.primary}40` },
  startBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  completeBtn: { backgroundColor: colors.successBg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.successBorder },
  completeBtnText: { color: colors.successText, fontWeight: '700', fontSize: 13 },

  // Earnings summary
  earningsSummary: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 20, ...shadows.md, marginBottom: 24 },
  earningsSummaryItem: { flex: 1, alignItems: 'center' },
  earningsSummaryNumber: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  earningsSummaryLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  earningsSummaryDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 8 },

  // Bar chart
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, marginBottom: 8, ...shadows.sm, height: CHART_HEIGHT + 80 },
  chartColumn: { flex: 1, alignItems: 'center' },
  chartValue: { fontSize: 9, color: colors.textMuted, textAlign: 'center', marginBottom: 2, minHeight: 12 },
  chartBarContainer: { width: '60%', height: CHART_HEIGHT, justifyContent: 'flex-end' },
  chartBar: { width: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  chartMonth: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 6 },
  chartCares: { fontSize: 9, color: colors.accent, marginTop: 2, minHeight: 12 },

  // Monthly rows
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: 14, ...shadows.sm, marginBottom: 8 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  monthCares: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  monthEarning: { fontSize: 16, fontWeight: '800', color: colors.primary },

  // Reviews
  reviewsHeader: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 20, ...shadows.md, marginBottom: 20 },
  reviewsAvgNumber: { fontSize: 48, fontWeight: '800', color: colors.textMain },
  reviewsAvgStars: { fontSize: 24, color: '#F59E0B', marginTop: 4 },
  reviewsCount: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, ...shadows.sm, marginBottom: 12 },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  reviewDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  reviewStarsRow: { flexDirection: 'row', gap: 2 },
  reviewStar: { fontSize: 18 },
  reviewComment: { fontSize: 14, color: colors.textMain, lineHeight: 20, fontStyle: 'italic', marginBottom: 8 },
  reviewTip: { backgroundColor: `${colors.primary}10`, borderRadius: 8, padding: 8, alignSelf: 'flex-start' },
  reviewTipText: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },

  // Tab Servicios
  serviciosIntro: { marginBottom: 20 },
  serviciosTitle: { fontSize: 22, fontWeight: '900', color: colors.textMain, marginBottom: 6, letterSpacing: -0.3 },
  serviciosSubtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  servicioBlock: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, ...shadows.md, marginBottom: 16 },
  servicioBlockHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  servicioBlockIcon: { fontSize: 28 },
  servicioBlockInfo: { flex: 1 },
  servicioBlockType: { fontSize: 15, fontWeight: '800', color: colors.textMain },
  servicioBlockDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillActive: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBorder },
  statusPillPaused: { backgroundColor: colors.border },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statusPillTextActive: { color: colors.successText },
  statusPillTextPaused: { color: colors.textMuted },
  servicioDetail: { backgroundColor: colors.background, borderRadius: 10, padding: 14, marginBottom: 14, gap: 8 },
  servicioDetailTitle: { fontSize: 14, fontWeight: '800', color: colors.textMain, marginBottom: 2 },
  servicioDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  servicioDetailLabel: { fontSize: 12, color: colors.textMuted },
  servicioDetailValue: { fontSize: 13, fontWeight: '700', color: colors.textMain },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  featurePill: { backgroundColor: `${colors.primary}12`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  featurePillText: { fontSize: 11, color: colors.primaryDark, fontWeight: '600' },
  featureMore: { fontSize: 11, color: colors.textMuted, alignSelf: 'center' },
  servicioBio: { fontSize: 12, color: colors.textMuted, lineHeight: 17, fontStyle: 'italic' },
  servicioEmpty: { backgroundColor: `${colors.warning}12`, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: `${colors.warning}30`, marginBottom: 14 },
  servicioEmptyText: { fontSize: 12, color: colors.warning, fontWeight: '600' },
  servicioBtn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  servicioBtnCreate: { backgroundColor: colors.primary, borderRadius: radii.lg },
  servicioBtnEdit: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radii.lg },
  servicioBtnText: { fontWeight: '800', fontSize: 14 },
  servicioBtnTextCreate: { color: colors.surface },
  servicioBtnTextEdit: { color: colors.primaryDark },
  serviciosHint: { backgroundColor: `${colors.primary}08`, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: `${colors.primary}20` },
  serviciosHintText: { fontSize: 12, color: colors.primaryDark, lineHeight: 18 },

  // Service cards
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, ...shadows.sm, marginBottom: 10 },
  serviceCardLeft: { flex: 1 },
  serviceCardLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  serviceCardTitle: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  serviceCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceActiveDot: { width: 7, height: 7, borderRadius: 4 },
  serviceCardSub: { fontSize: 12, color: colors.textMuted },
  serviceCardEmpty: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  serviceManageBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  serviceManageBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },

  // Flow stepper
  flowContainer: { marginVertical: 12 },
  flowWrapper: { flexDirection: 'row', alignItems: 'flex-start' },
  flowStepCol: { alignItems: 'center', width: 64 },
  flowDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  flowDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  flowDotActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  flowDotCheck: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14 },
  flowDotNum: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  flowLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 12 },
  flowLineDone: { backgroundColor: colors.primary },
  flowLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textAlign: 'center', marginTop: 5 },
  flowLabelActive: { color: colors.accent, fontWeight: '800' },
  flowLabelDone: { color: colors.primary, fontWeight: '700' },
  flowSublabel: { fontSize: 9, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  flowActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12, marginTop: 10, gap: 10, borderWidth: 1, borderColor: `${colors.primary}30` },
  flowActionBtnGreen: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  flowActionIcon: { fontSize: 22 },
  flowActionText: { flex: 1 },
  flowActionTitle: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
  flowActionSub: { fontSize: 11, color: colors.primaryDark, marginTop: 2, opacity: 0.7 },
  flowActionArrow: { fontSize: 22, color: colors.primaryDark, fontWeight: '300' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 32 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});
