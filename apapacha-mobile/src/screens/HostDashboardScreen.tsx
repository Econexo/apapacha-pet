import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Booking } from '../types/database';
import { getMyHostBookings } from '../services/host.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendiente',
  active:    'Activa',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
  pending:   colors.warning,
  active:    colors.accent,
  completed: colors.primary,
  cancelled: colors.danger,
};

const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`;

export function HostDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyHostBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeBookings  = bookings.filter(b => b.status === 'active');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const totalEarnings   = bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + b.total_price, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel de Cuidador</Text>
        <TouchableOpacity style={styles.exitBtn} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.exitBtnText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{activeBookings.length}</Text>
              <Text style={styles.statLabel}>Activas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingBookings.length}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
            <View style={[styles.statCard, { borderColor: colors.accent }]}>
              <Text style={[styles.statNumber, { color: colors.accent, fontSize: 18 }]}>{fmt(totalEarnings)}</Text>
              <Text style={styles.statLabel}>Ganancias</Text>
            </View>
          </View>

          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>Sin reservas aún</Text>
              <Text style={styles.emptyText}>Cuando tengas clientes, aparecerán aquí.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Todas las Reservas</Text>
              {bookings.map(booking => (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingRow}>
                    <View>
                      <Text style={styles.bookingId}>Reserva #{booking.id.slice(0, 8)}</Text>
                      <Text style={styles.bookingDates}>{booking.start_date} → {booking.end_date}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[booking.status]}20` }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLOR[booking.status] }]}>
                        {STATUS_LABEL[booking.status]}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bookingFooter}>
                    <Text style={styles.bookingTotal}>{fmt(booking.total_price)}</Text>
                    <Text style={styles.bookingPayment}>
                      {booking.payment_status === 'paid' ? '💰 Pagado' : '⏳ Pago pendiente'}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.surface },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textMain },
  exitBtn: { padding: 8, backgroundColor: colors.dangerBg, borderRadius: 8 },
  exitBtnText: { color: colors.danger, fontWeight: '700' },
  scrollContainer: { padding: 20, paddingBottom: 80 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: colors.surface, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textMain, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain, marginBottom: 16 },
  bookingCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  bookingId: { fontSize: 13, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  bookingDates: { fontSize: 12, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingTotal: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  bookingPayment: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
});
