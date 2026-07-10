import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, shadows, label } from '../theme/design';
import type { RootStackParamList } from '../types/navigation';
import type { Booking } from '../types/database';
import { getMyBookings, cancelBooking } from '../services/bookings.service';
import { supabase } from '../../supabase';
import { OverlayModal } from '../components/OverlayModal';
import { LeaveReviewScreen } from './LeaveReviewScreen';
import { useToast } from '../components/Toast';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { fonts } from '../theme/typography';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAYMENT_STATUS_CONFIG: Record<string, { text: string; color: string; icon: IoniconName }> = {
  pending:            { text: 'Pago pendiente',     color: '#F59E0B', icon: 'time-outline'              },
  receipt_submitted:  { text: 'Comprobante enviado', color: '#6366F1', icon: 'document-attach-outline'  },
  paid:               { text: 'Pagado',              color: '#10B981', icon: 'checkmark-circle-outline' },
  refunded:           { text: 'Reembolsado',         color: '#6B7280', icon: 'arrow-undo-outline'       },
};

const STATUS_CONFIG: Record<string, { icon: IoniconName; color: string; label: string }> = {
  active:    { icon: 'radio-button-on',        color: '#10B981', label: 'En curso'   },
  pending:   { icon: 'time-outline',           color: colors.primary, label: 'Pendiente' },
  completed: { icon: 'checkmark-circle-outline', color: colors.accent, label: 'Completada' },
  cancelled: { icon: 'close-circle-outline',   color: colors.danger,  label: 'Cancelada'  },
};

export function BookingsScreen() {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [hostMap, setHostMap] = useState<Record<string, { id: string; name: string; serviceId: string; serviceType: string; serviceName: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ bookingId: string; hostId: string; hostName: string } | null>(null);

  const autoPromptedRef = React.useRef(false);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    loadAll(cancelled).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []));

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  async function loadAll(cancelled = false) {
    try {
      const data = await getMyBookings();
      if (cancelled) return;
      setBookings(data);

      const spaceIds   = [...new Set(data.filter(b => b.service_type === 'space').map(b => b.service_id))];
      const visiterIds = [...new Set(data.filter(b => b.service_type === 'visiter').map(b => b.service_id))];
      const completedIds = data.filter(b => b.status === 'completed').map(b => b.id);

      const [spacesRes, visitersRes, reviewsRes] = await Promise.all([
        spaceIds.length
          ? supabase.from('spaces').select('id, host_id, title').in('id', spaceIds)
          : Promise.resolve({ data: [] as any[] }),
        visiterIds.length
          ? supabase.from('visiters').select('id, host_id, name').in('id', visiterIds)
          : Promise.resolve({ data: [] as any[] }),
        completedIds.length
          ? supabase.from('reviews').select('booking_id').in('booking_id', completedIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // Separate profiles lookup — avoids ambiguous FK embed that can fail silently
      const spaceHostIds = [...new Set((spacesRes.data ?? []).map((s: any) => s.host_id).filter(Boolean))];
      const profilesRes = spaceHostIds.length
        ? await supabase.from('public_profiles').select('id, full_name, last_name').in('id', spaceHostIds)
        : { data: [] as any[] };
      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));

      if (cancelled) return;

      const hosts: Record<string, { id: string; name: string; serviceId: string; serviceType: string; serviceName: string }> = {};
      for (const b of data) {
        if (b.service_type === 'space') {
          const sp = (spacesRes.data ?? []).find((s: any) => s.id === b.service_id);
          if (sp) {
            const prof = profileMap.get(sp.host_id);
            const name = prof ? `${prof.full_name ?? ''} ${prof.last_name ?? ''}`.trim() || 'Cuidador' : 'Cuidador';
            hosts[b.id] = { id: sp.host_id, name, serviceId: sp.id, serviceType: 'space', serviceName: sp.title };
          }
        } else {
          const vi = (visitersRes.data ?? []).find((v: any) => v.id === b.service_id);
          if (vi) hosts[b.id] = { id: vi.host_id, name: vi.name ?? 'Cuidador', serviceId: vi.id, serviceType: 'visiter', serviceName: vi.name ?? 'Visita Básica' };
        }
      }

      const reviewed = new Set<string>((reviewsRes.data ?? []).map((r: any) => r.booking_id));

      setHostMap(hosts);
      setReviewedIds(reviewed);

      // Auto-prompt: find most recent completed booking without review
      if (!autoPromptedRef.current) {
        const pending = data
          .filter(b => b.status === 'completed' && !reviewed.has(b.id))
          .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
        const toReview = pending[0];
        if (toReview && hosts[toReview.id]) {
          autoPromptedRef.current = true;
          const h = hosts[toReview.id];
          setReviewModal({ bookingId: toReview.id, hostId: h.id, hostName: h.name });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCancel(bookingId: string) {
    const doCancel = async () => {
      try {
        await cancelBooking(bookingId);
        loadAll();
      } catch (e: any) {
        toast.error('Error', e.message);
      }
    };

    if (Platform.OS === 'web') {
      if ((window as any).confirm('El seguro Zero Trust no es reembolsable. ¿Confirmas la cancelación?')) {
        await doCancel();
      }
    } else {
      Alert.alert('Cancelar reserva', 'El seguro Zero Trust no es reembolsable. ¿Confirmas la cancelación?', [
        { text: 'Volver', style: 'cancel' },
        { text: 'Cancelar reserva', style: 'destructive', onPress: doCancel },
      ]);
    }
  }

  const active  = bookings.filter(b => b.status === 'active' || b.status === 'pending');
  const past    = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
  const fmt     = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reservas</Text>
      </View>
      <FlatList
        data={[...active, ...past]}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContainer, bookings.length === 0 && styles.emptyContainer]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            {active.length > 0 && <Text style={styles.sectionTitle}>En curso y próximas</Text>}
            {active.length === 0 && past.length > 0 && (
              <View style={styles.emptyActiveCard}>
                <Ionicons name="calendar-outline" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
                <Text style={styles.emptyActiveText}>Sin reservas pendientes</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item, index }) => {
          const isFirstPast = index === active.length;
          const host = hostMap[item.id];
          const hasReview = reviewedIds.has(item.id);
          const isActive = item.status === 'active' || item.status === 'pending';
          const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
          const payStatus = PAYMENT_STATUS_CONFIG[item.payment_status ?? 'pending'];

          return (
            <>
              {isFirstPast && past.length > 0 && (
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Historial</Text>
              )}
              <View style={[styles.card, isActive ? styles.cardActive : styles.cardPast, item.status === 'cancelled' && styles.cardCancelled]}>
                {/* Header row */}
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}15`, flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                    <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                  </View>
                  <Text style={styles.dates}>{fmt(item.start_date)} — {fmt(item.end_date)}</Text>
                </View>

                {/* Service type + name */}
                <View style={styles.serviceRow}>
                  <Ionicons name={item.service_type === 'space' ? 'home-outline' : 'car-outline'} size={15} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle} numberOfLines={1}>
                      {host?.serviceName ?? (item.service_type === 'space' ? 'Alojamiento' : 'Visita Domiciliaria')}
                    </Text>
                    <Text style={styles.serviceSubLabel}>
                      {item.service_type === 'space' ? 'Alojamiento' : 'Visita Domiciliaria'}
                      {host?.name ? ` · ${host.name}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Price */}
                <Text style={styles.priceLabel}>${item.total_price.toLocaleString('es-CL')} CLP</Text>

                {/* Service phase pill — only for active bookings */}
                {item.status === 'active' && (
                  <View style={[
                    styles.phasePill,
                    item.service_phase === 'in_progress' ? styles.phasePillActive : styles.phasePillWaiting,
                  ]}>
                    <View style={[styles.phaseDot, item.service_phase === 'in_progress' ? styles.phaseDotActive : styles.phaseDotWaiting]} />
                    <Text style={[styles.phaseText, item.service_phase === 'in_progress' ? styles.phaseTextActive : styles.phaseTextWaiting]}>
                      {item.service_phase === 'in_progress' ? 'Servicio en curso' : 'Esperando inicio del servicio'}
                    </Text>
                  </View>
                )}

                {/* CTA contextual: aceptación del cuidador → pago → confirmación */}
                {isActive && (() => {
                  if (item.host_response === 'pending') {
                    return (
                      <View style={[styles.infoRow, { backgroundColor: `${colors.warning}12` }]}>
                        <Ionicons name="hourglass-outline" size={14} color={colors.warning} />
                        <Text style={[styles.infoRowText, { color: colors.warningText }]}>Esperando que el cuidador acepte tu solicitud</Text>
                      </View>
                    );
                  }
                  const paid = item.payment_status === 'paid' || item.status === 'active';
                  const submitted = item.payment_status === 'receipt_submitted';
                  if (!paid && !submitted) {
                    return (
                      <TouchableOpacity style={styles.payCta} activeOpacity={0.9}
                        onPress={() => navigation.navigate('TransferInstructions', { bookingId: item.id, amount: item.total_price })}>
                        <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                        <Text style={styles.payCtaText}>Subir comprobante de pago</Text>
                      </TouchableOpacity>
                    );
                  }
                  if (submitted) {
                    return (
                      <View style={[styles.infoRow, { backgroundColor: `${colors.info}12` }]}>
                        <Ionicons name="time-outline" size={14} color={colors.info} />
                        <Text style={[styles.infoRowText, { color: colors.info }]}>Comprobante en revisión por el equipo</Text>
                      </View>
                    );
                  }
                  return (
                    <View style={[styles.infoRow, { backgroundColor: `${colors.success}12` }]}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                      <Text style={[styles.infoRowText, { color: colors.successText }]}>Pago confirmado</Text>
                    </View>
                  );
                })()}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {isActive && (
                    <>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('ChatDetail', { id: item.id })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="chatbubble-outline" size={14} color={colors.textMain} />
                        <Text style={styles.actionBtnText}>Chat</Text>
                      </TouchableOpacity>
                      {item.status === 'pending' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnDanger]}
                          onPress={() => handleCancel(item.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-outline" size={14} color={colors.danger} />
                          <Text style={[styles.actionBtnText, { color: colors.danger }]}>Cancelar</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {item.status === 'completed' && (
                    <>
                      {!hasReview ? (
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => host && setReviewModal({ bookingId: item.id, hostId: host.id, hostName: host.name })}
                          disabled={!host}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="star-outline" size={14} color={colors.textMain} />
                          <Text style={styles.actionBtnText}>Reseñar</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.reviewDone}>
                          <Ionicons name="star" size={14} color={colors.accent} />
                          <Text style={styles.reviewDoneText}>Reseña enviada</Text>
                        </View>
                      )}
                      {host && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnRepeat]}
                          onPress={() => navigation.navigate('Checkout', { id: host.serviceId, type: host.serviceType as 'space' | 'visiter' })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="refresh-outline" size={14} color={colors.primaryDark} />
                          <Text style={[styles.actionBtnText, { color: colors.primaryDark }]}>Repetir</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            </>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="calendar-outline" size={38} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Sin reservas aún</Text>
              <Text style={styles.emptyText}>Cuando reserves un espacio o visita, aparecerá aquí.</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Explore' })}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>Explorar cuidadores →</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      {reviewModal && (
        <OverlayModal visible={!!reviewModal} onClose={() => setReviewModal(null)}>
          <LeaveReviewScreen
            bookingId={reviewModal.bookingId}
            hostId={reviewModal.hostId}
            hostName={reviewModal.hostName}
            onClose={() => { setReviewModal(null); loadAll(); }}
          />
        </OverlayModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.surface },
  headerTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.textMain, letterSpacing: -0.5 },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  emptyContainer: { flexGrow: 1 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.textMain, letterSpacing: -0.2, marginBottom: 12 },
  card: { borderRadius: radii.lg, padding: 18, marginBottom: 14, ...shadows.md },
  cardActive: { backgroundColor: colors.surface },
  cardPast: { backgroundColor: colors.surface },
  cardCancelled: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  dates: { fontSize: 12, color: colors.textMuted },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain },
  serviceSubLabel: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  priceLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radii.md, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10 },
  paymentText: { fontSize: 12, fontWeight: '700' },
  paymentAction: { fontSize: 12, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radii.md, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 10 },
  infoRowText: { flex: 1, fontSize: 12.5, fontWeight: '700' },
  payCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 13, marginBottom: 10, ...shadows.sm },
  payCtaText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.md, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionBtnDanger: { backgroundColor: `${colors.danger}08` },
  actionBtnRepeat: { backgroundColor: `${colors.primary}08` },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: colors.textMain },
  reviewDone: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewDoneText: { fontSize: 13, color: colors.accent, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 12, paddingHorizontal: 32 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.textMain },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  emptyBtn: { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radii.lg },
  emptyBtnText: { color: colors.surface, fontWeight: '800', fontSize: 14 },
  emptyActiveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, marginBottom: 16, ...shadows.sm },
  emptyActiveText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  phasePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.md, marginBottom: 8 },
  phasePillActive: { backgroundColor: colors.successBg },
  phasePillWaiting: { backgroundColor: `${colors.primary}08` },
  phaseDot: { width: 7, height: 7, borderRadius: 4 },
  phaseDotActive: { backgroundColor: colors.successText },
  phaseDotWaiting: { backgroundColor: colors.primary },
  phaseText: { fontSize: 12, fontWeight: '700' },
  phaseTextActive: { color: colors.successText },
  phaseTextWaiting: { color: colors.primaryDark },
});
