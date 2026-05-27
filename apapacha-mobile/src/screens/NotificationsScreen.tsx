import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { supabase } from '../../supabase';
import {
  getMyNotifications, markAsRead, markAllAsRead,
} from '../services/notifications.service';
import type { Notification } from '../types/database';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_ICON: Record<string, { icon: IoniconName; color: string }> = {
  booking_created:   { icon: 'calendar-outline',          color: colors.primary  },
  receipt_submitted: { icon: 'card-outline',               color: colors.warning  },
  booking_confirmed: { icon: 'checkmark-circle-outline',   color: colors.success  },
  application_approved: { icon: 'ribbon-outline',          color: colors.accent   },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export function NotificationsScreen() {
  const navigation = useNavigation() as any;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getMyNotifications();
    setNotifications(data);
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription for new notifications
  useEffect(() => {
    const channel = supabase
      .channel('my_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const handleTap = async (n: Notification) => {
    if (!n.read) {
      await markAsRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAll} style={styles.markAllBtn} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Leer todo</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>Sin notificaciones por ahora</Text>
          </View>
        }
        renderItem={({ item: n }) => {
          const meta = TYPE_ICON[n.type] ?? { icon: 'notifications-outline' as IoniconName, color: colors.primary };
          return (
            <TouchableOpacity
              style={[styles.notifCard, !n.read && styles.notifCardUnread]}
              onPress={() => handleTap(n)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
                <Ionicons name={meta.icon} size={22} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>{n.title}</Text>
                <Text style={styles.notifBody}>{n.body}</Text>
                <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  markAllText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  notifCardUnread: { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}06` },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: colors.textMain, marginBottom: 3 },
  notifTitleUnread: { fontWeight: '800' },
  notifBody: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4, flexShrink: 0 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
