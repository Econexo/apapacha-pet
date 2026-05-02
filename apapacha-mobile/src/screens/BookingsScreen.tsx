import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Booking } from '../types/database';
import { getMyBookings, cancelBooking } from '../services/bookings.service';
import { getMyReviewForBooking } from '../services/reviews.service';
import { supabase } from '../../supabase';

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [hostMap, setHostMap] = useState<Record<string, { id: string; name: string; serviceId: string; serviceType: string }>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  async function loadAll() {
    try {
      const data = await getMyBookings();
      setBookings(data);

      const completed = data.filter(b => b.status === 'completed');
      const reviewed = new Set<string>();
      await Promise.all(completed.map(async b => {
        const r = await getMyReviewForBooking(b.id);
        if (r) reviewed.add(b.id);
      }));
      setReviewedIds(reviewed);

      const hosts: Record<string, { id: string; name: string; serviceId: string; serviceType: string }> = {};
      await Promise.all(data.map(async b => {
        if (b.service_type === 'space') {
          const { data: sp } = await supabase.from('spaces').select('host_id, title, id').eq('id', b.service_id).single();
          if (sp) {
            const { data: prof } = await supabase.from('profiles').select('id, full_name, last_name').eq('id', sp.host_id).single();
            if (prof) hosts[b.id] = { id: prof.id, name: `${prof.full_name} ${prof.last_name ?? ''}`.trim(), serviceId: sp.id, serviceType: 'space' };
          }
        } else {
          const { data: vi } = await supabase.from('visiters').select('host_id, name, id').eq('id', b.service_id).single();
          if (vi) hosts[b.id] = { id: vi.host_id, name: vi.name, serviceId: vi.id, serviceType: 'visiter' };
        }
      }));
      setHostMap(hosts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(bookingId: string) {
    Alert.alert(
      'Cancelar reserva',
      'El seguro Zero Trust no es reembolsable. ¿Confirmas la cancelación?',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Cancelar reserva', style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(bookingId);
              loadAll();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  const active  = bookings.filter(b => b.status === 'active' || b.status === 'pending');
  const past    = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
  const fmt     = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reservas</Text>
      </View>
      <FlatList
        data={[...active, ...past]}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContainer, bookings.length === 0 && styles.emptyContainer]}
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

                {/* Service type */}
                <View style={styles.serviceRow}>
                  <Ionicons name={item.service_type === 'space' ? 'home-outline' : 'car-outline'} size={15} color={colors.textMuted} />
                  <Text style={styles.serviceTitle}>{item.service_type === 'space' ? 'Alojamiento' : 'Visita Domiciliaria'}</Text>
                </View>

                {/* Price */}
                <Text style={styles.priceLabel}>${item.total_price.toLocaleString('es-CL')} CLP</Text>

                {/* Payment status for active/pending */}
                {isActive && payStatus && (
                  <View style={[styles.paymentRow, { backgroundColor: `${payStatus.color}12` }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name={payStatus.icon} size={13} color={payStatus.color} />
                      <Text style={[styles.paymentText, { color: payStatus.color }]}>{payStatus.text}</Text>
                    </View>
                    {item.payment_status === 'pending' && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('TransferInstructions', { bookingId: item.id, amount: item.total_price })}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.paymentAction, { color: payStatus.color }]}>Ver instrucciones →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

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
                          onPress={() => host && navigation.navigate('LeaveReview', { bookingId: item.id, hostId: host.id, hostName: host.name })}
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
              <Ionicons name="calendar-outline" size={56} color={`${colors.primary}60`} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.surface },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textMain, letterSpacing: -0.5 },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  emptyContainer: { flexGrow: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardActive: { backgroundColor: colors.surface, borderColor: colors.primary },
  cardPast: { backgroundColor: colors.surface, borderColor: colors.border },
  cardCancelled: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  dates: { fontSize: 12, color: colors.textMuted },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain },
  priceLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10 },
  paymentText: { fontSize: 12, fontWeight: '700' },
  paymentAction: { fontSize: 12, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionBtnDanger: { borderColor: `${colors.danger}40`, backgroundColor: `${colors.danger}08` },
  actionBtnRepeat: { borderColor: `${colors.primary}30`, backgroundColor: `${colors.primary}08` },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: colors.textMain },
  reviewDone: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewDoneText: { fontSize: 13, color: colors.accent, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.textMain },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: colors.surface, fontWeight: '800', fontSize: 14 },
  emptyActiveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  emptyActiveText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
});
