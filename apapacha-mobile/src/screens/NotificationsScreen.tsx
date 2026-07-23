import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii, shadows } from '../theme/design';
import { supabase } from '../../supabase';
import {
  getMyNotifications, markAsRead, markAllAsRead,
} from '../services/notifications.service';
import type { Notification } from '../types/database';
import { notificationTarget } from '../lib/notificationRoute';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type FilterKey = 'all' | 'bookings' | 'services' | 'application';

const FILTERS: { key: FilterKey; label: string; icon: IoniconName; types: string[] }[] = [
  { key: 'all',         label: 'Todas',        icon: 'notifications-outline', types: []                                                          },
  { key: 'bookings',    label: 'Reservas',      icon: 'calendar-outline',      types: ['booking_created', 'booking_accepted', 'booking_rejected', 'receipt_submitted', 'booking_confirmed'] },
  { key: 'services',    label: 'Servicios',     icon: 'paw-outline',           types: ['service_started', 'service_completed']                     },
  { key: 'application', label: 'Aplicación',    icon: 'ribbon-outline',        types: ['application_approved', 'application_rejected']             },
];

const TYPE_META: Record<string, { icon: IoniconName; color: string; bg: string }> = {
  booking_created:      { icon: 'calendar-outline',          color: colors.primary,  bg: `${colors.primary}15`  },
  receipt_submitted:    { icon: 'card-outline',               color: colors.warning,  bg: `${colors.warning}15`  },
  booking_confirmed:    { icon: 'checkmark-circle-outline',   color: colors.success,  bg: `${colors.success}15`  },
  booking_accepted:     { icon: 'checkmark-circle-outline',   color: colors.success,  bg: `${colors.success}15`  },
  booking_rejected:     { icon: 'close-circle-outline',       color: colors.danger,   bg: `${colors.danger}10`   },
  application_approved: { icon: 'ribbon-outline',             color: colors.accent,   bg: `${colors.accent}15`   },
  application_rejected: { icon: 'close-circle-outline',       color: colors.danger,   bg: `${colors.danger}10`   },
  service_started:      { icon: 'play-circle-outline',        color: colors.primary,  bg: `${colors.primary}15`  },
  service_completed:    { icon: 'checkmark-done-outline',     color: colors.success,  bg: `${colors.success}15`  },
};

const DEFAULT_META: { icon: IoniconName; color: string; bg: string } = {
  icon: 'notifications-outline', color: colors.primary, bg: `${colors.primary}10`,
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

function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.skeletonCard, { opacity: pulse }]}>
      <View style={styles.skeletonIcon} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skeletonLine, { width: '40%' }]} />
        <View style={[styles.skeletonLine, { width: '90%' }]} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    </Animated.View>
  );
}

function NotifCard({ item, index, onTap }: { item: Notification; index: number; onTap: (n: Notification) => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const meta = TYPE_META[item.type] ?? DEFAULT_META;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      delay: index * 45,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
    }}>
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.notifCardUnread]}
        onPress={() => onTap(item)}
        activeOpacity={0.75}
      >
        {!item.read && <View style={styles.unreadBar} />}
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>{item.title}</Text>
          <Text style={styles.notifBody}>{item.body}</Text>
          <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation() as any;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

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

  useEffect(() => {
    const channel = supabase
      .channel('my_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const handleTap = async (n: Notification) => {
    if (!n.read) {
      await markAsRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    const target = notificationTarget(n);
    if (target) navigation.navigate(target.screen, target.params);
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeFilter = FILTERS.find(f => f.key === filter)!;
  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => activeFilter.types.includes(n.type));

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAll} style={styles.markAllBtn} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Leer todo</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 70 }} />}
      </View>

      {/* Filter chips */}
      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.75}
              >
                <Ionicons name={f.icon} size={12} color={active ? '#fff' : colors.textMuted} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.listContent}>
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={n => n.id}
          contentContainerStyle={[styles.listContent, filtered.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name={filter === 'all' ? 'notifications-off-outline' : activeFilter.icon} size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'Sin notificaciones' : `Sin notificaciones de ${activeFilter.label.toLowerCase()}`}
              </Text>
              <Text style={styles.emptyText}>Te avisaremos cuando haya novedades.</Text>
              {filter !== 'all' && (
                <TouchableOpacity onPress={() => setFilter('all')} style={styles.emptyLink} activeOpacity={0.7}>
                  <Text style={styles.emptyLinkText}>Ver todas</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <NotifCard item={item} index={index} onTap={handleTap} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface,
    shadowColor: '#1A0A2E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.textMain },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  markAllText: { fontSize: 12, color: colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  filtersWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.full,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipTextActive: { color: '#fff' },

  listContent: { padding: 16, paddingBottom: 40, gap: 10 },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14,
    overflow: 'hidden', ...shadows.sm,
  },
  notifCardUnread: { backgroundColor: `${colors.primary}06` },
  unreadBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 4, backgroundColor: colors.primary, borderTopLeftRadius: radii.lg, borderBottomLeftRadius: radii.lg,
  },
  iconWrap: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: colors.textMain },
  notifTitleUnread: { fontWeight: '800' },
  notifBody: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  notifTime: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4, flexShrink: 0 },

  skeletonCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, ...shadows.sm,
  },
  skeletonIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.border, flexShrink: 0 },
  skeletonLine: { height: 10, borderRadius: 5, backgroundColor: colors.border },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  emptyLink: { marginTop: 4 },
  emptyLinkText: { fontSize: 13, color: colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
});
