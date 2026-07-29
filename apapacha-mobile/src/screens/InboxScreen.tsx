import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii, shadows } from '../theme/design';
import type { RootStackParamList } from '../types/navigation';
import type { Booking } from '../types/database';
import { getMyBookings } from '../services/bookings.service';
import { supabase } from '../../supabase';
import { useAuth } from '../context/AuthContext';
import { GuestGate } from '../components/GuestGate';
import { ScreenBackground } from '../components/ui/ScreenBackground';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface LastMessage { content: string; created_at: string }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Esperando confirmación', color: colors.warning   },
  active:    { label: 'Reserva activa',          color: colors.accent    },
  completed: { label: 'Cuidado finalizado',      color: colors.textMuted },
};

export function InboxScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [lastMsgs, setLastMsgs] = useState<Record<string, LastMessage>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInbox = useCallback(async () => {
    const data = await getMyBookings();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const active = data.filter(b =>
      b.status === 'active' || b.status === 'pending' ||
      (b.status === 'completed' && new Date(b.end_date) >= cutoff)
    );

    if (active.length === 0) { setBookings([]); setNameMap({}); setLastMsgs({}); return; }

    const bookingIds = active.map(b => b.id);
    const spaceIds   = [...new Set(active.filter(b => b.service_type === 'space').map(b => b.service_id))];
    const visiterIds = [...new Set(active.filter(b => b.service_type === 'visiter').map(b => b.service_id))];

    const [spacesRes, visitersRes, msgsRes] = await Promise.all([
      spaceIds.length ? supabase.from('spaces').select('id, title').in('id', spaceIds) : Promise.resolve({ data: [] }),
      visiterIds.length ? supabase.from('visiters').select('id, name').in('id', visiterIds) : Promise.resolve({ data: [] }),
      supabase.from('messages').select('booking_id, content, created_at, image_url, video_url').in('booking_id', bookingIds).order('created_at', { ascending: false }),
    ]);

    // Build last-message map (first occurrence per booking_id = most recent)
    const msgMap: Record<string, LastMessage> = {};
    for (const m of (msgsRes.data ?? []) as any[]) {
      if (!msgMap[m.booking_id]) msgMap[m.booking_id] = { content: m.content?.trim() ? m.content : (m.video_url ? '🎥 Video' : m.image_url ? '📷 Foto' : ''), created_at: m.created_at };
    }

    // Only keep bookings that have at least one message
    const withMessages = active.filter(b => msgMap[b.id]);

    const nameM: Record<string, string> = {};
    for (const b of withMessages) {
      if (b.service_type === 'space') {
        const sp = (spacesRes.data ?? []).find((s: any) => s.id === b.service_id);
        if (sp) nameM[b.id] = (sp as any).title;
      } else {
        const vi = (visitersRes.data ?? []).find((v: any) => v.id === b.service_id);
        if (vi) nameM[b.id] = (vi as any).name;
      }
    }

    setBookings(withMessages);
    setNameMap(nameM);
    setLastMsgs(msgMap);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadInbox().catch(console.error).finally(() => setLoading(false));
  }, [loadInbox]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInbox().catch(console.error);
    setRefreshing(false);
  };

  const fmtDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  if (!session) {
    return <GuestGate title="Mensajes" body="Ingresa a tu cuenta para chatear con los cuidadores de tus reservas." icon="chatbubbles-outline" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
        <Text style={styles.headerSub}>
          {bookings.length > 0 ? `${bookings.length} conversación${bookings.length > 1 ? 'es' : ''}` : 'Tus chats de reservas'}
        </Text>
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
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.active;
          const title = nameMap[item.id] ?? (item.service_type === 'space' ? 'Alojamiento' : 'Visita Domiciliaria');
          const lastMsg = lastMsgs[item.id];
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
                  {lastMsg && <Text style={styles.time}>{fmtDate(lastMsg.created_at)}</Text>}
                </View>
                {lastMsg ? (
                  <Text style={styles.preview} numberOfLines={1}>{lastMsg.content}</Text>
                ) : (
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="chatbubbles-outline" size={34} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
              <Text style={styles.emptyText}>Cuando reserves un servicio y comiences a chatear con tu cuidador, la conversación aparecerá aquí.</Text>
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
  headerTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.textMain, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  listContent: { padding: 16, gap: 10 },
  chatCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: 16, ...shadows.sm,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 26 },
  messageContent: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, color: colors.textMain, fontWeight: '700', flex: 1, marginRight: 8 },
  time: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  preview: { fontSize: 13, color: colors.textMuted, fontWeight: '400' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.textMain },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});
