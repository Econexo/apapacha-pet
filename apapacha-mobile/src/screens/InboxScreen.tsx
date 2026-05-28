import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, shadows } from '../theme/design';
import type { RootStackParamList } from '../types/navigation';
import type { Booking } from '../types/database';
import { getMyBookings } from '../services/bookings.service';
import { supabase } from '../../supabase';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Esperando confirmación', color: colors.warning,     bg: `${colors.warning}18`     },
  active:    { label: 'Reserva activa',          color: colors.accent,      bg: `${colors.accent}18`      },
  completed: { label: 'Cuidado finalizado',      color: colors.textMuted,   bg: colors.background         },
};

export function InboxScreen() {
  const navigation = useNavigation<Nav>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInbox = useCallback(async () => {
    const data = await getMyBookings();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const active = data.filter(b =>
      b.status === 'active' || b.status === 'pending' ||
      (b.status === 'completed' && new Date(b.end_date) >= cutoff)
    );
    setBookings(active);
    const spaceIds   = [...new Set(active.filter(b => b.service_type === 'space').map(b => b.service_id))];
    const visiterIds = [...new Set(active.filter(b => b.service_type === 'visiter').map(b => b.service_id))];
    const [spacesRes, visitersRes] = await Promise.all([
      spaceIds.length ? supabase.from('spaces').select('id, title').in('id', spaceIds) : Promise.resolve({ data: [] }),
      visiterIds.length ? supabase.from('visiters').select('id, name').in('id', visiterIds) : Promise.resolve({ data: [] }),
    ]);
    const map: Record<string, string> = {};
    for (const b of active) {
      if (b.service_type === 'space') {
        const sp = (spacesRes.data ?? []).find((s: any) => s.id === b.service_id);
        if (sp) map[b.id] = sp.title;
      } else {
        const vi = (visitersRes.data ?? []).find((v: any) => v.id === b.service_id);
        if (vi) map[b.id] = vi.name;
      }
    }
    setNameMap(map);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadInbox().catch(console.error).finally(() => setLoading(false));
    }, [loadInbox])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInbox().catch(console.error);
    setRefreshing(false);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  const statusCfg = (b: Booking) => STATUS_CONFIG[b.status] ?? STATUS_CONFIG.active;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
        <Text style={styles.headerSub}>{bookings.length > 0 ? `${bookings.length} conversaciones activas` : 'Tus chats de reservas'}</Text>
      </View>

      {loading && bookings.length === 0 && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        contentContainerStyle={[styles.listContent, bookings.length === 0 && { flex: 1 }]}
        renderItem={({ item }) => {
          const cfg = statusCfg(item);
          const title = nameMap[item.id] ?? (item.service_type === 'space' ? 'Alojamiento' : 'Visita Domiciliaria');
          return (
            <TouchableOpacity
              style={styles.chatCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ChatDetail', { id: item.id })}
            >
              <View style={[styles.avatar, { backgroundColor: item.service_type === 'space' ? colors.primaryLight : `${colors.accent}22` }]}>
                <Text style={styles.avatarEmoji}>{item.service_type === 'space' ? '🏠' : '🚗'}</Text>
              </View>
              <View style={styles.messageContent}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{title}</Text>
                  <Text style={styles.time}>{fmt(item.start_date)}</Text>
                </View>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Text style={styles.emptyEmoji}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
              <Text style={styles.emptyText}>Cuando reserves un servicio, el chat con tu cuidador aparecerá aquí.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: colors.surface,
    shadowColor: '#1A0A2E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textMain, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },

  listContent: { padding: 16, gap: 10 },

  chatCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: 16, ...shadows.sm,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 26 },
  messageContent: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 15, color: colors.textMain, fontWeight: '700', flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.textMain },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});
