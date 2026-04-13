import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Booking } from '../types/database';
import { getMyBookings } from '../services/bookings.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function BookingsScreen() {
  const navigation = useNavigation<Nav>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getMyBookings()
        .then(setBookings)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [])
  );

  const active = bookings.filter(b => b.status === 'active' || b.status === 'pending');
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
  const fmt = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reservas</Text>
      </View>
      <FlatList
        data={[...active, ...past]}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        ListHeaderComponent={
          active.length > 0 ? <Text style={styles.sectionTitle}>En curso y próximas</Text> : null
        }
        renderItem={({ item, index }) => {
          const isFirstPast = index === active.length;
          return (
            <>
              {isFirstPast && past.length > 0 && (
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Historial</Text>
              )}
              {(item.status === 'active' || item.status === 'pending') ? (
                <TouchableOpacity
                  style={styles.cardActive}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('ChatDetail', { id: item.id })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.statusBadge}>{item.status === 'active' ? 'En Curso' : 'Pendiente'}</Text>
                    <Text style={styles.dates}>{fmt(item.start_date)} - {fmt(item.end_date)}</Text>
                  </View>
                  <Text style={styles.title}>{item.service_type === 'space' ? '🏠 Alojamiento' : '🚗 Visita Domiciliaria'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.cardPast}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.statusBadgePast}>{item.status === 'completed' ? 'Completada' : 'Cancelada'}</Text>
                    <Text style={styles.dates}>{fmt(item.start_date)} - {fmt(item.end_date)}</Text>
                  </View>
                  <Text style={styles.title}>{item.service_type === 'space' ? '🏠 Alojamiento' : '🚗 Visita Domiciliaria'}</Text>
                </View>
              )}
            </>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No tienes reservas aún.</Text>
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
  scrollContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain, marginBottom: 16 },
  cardActive: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.primary, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { backgroundColor: colors.primary, color: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: '800' },
  statusBadgePast: { backgroundColor: colors.background, color: colors.textMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: '800' },
  dates: { fontSize: 13, color: colors.textMuted },
  title: { fontSize: 16, fontWeight: '700', color: colors.textMain },
  cardPast: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16, opacity: 0.7 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
});
