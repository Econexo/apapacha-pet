import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback,
  FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { supabase } from '../../supabase';
import {
  getMyNotifications, markAsRead, markAllAsRead,
} from '../services/notifications.service';
import type { Notification } from '../types/database';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_ICON: Record<string, { icon: IoniconName; color: string }> = {
  booking_created:      { icon: 'calendar-outline',        color: colors.primary },
  receipt_submitted:    { icon: 'card-outline',             color: colors.warning },
  booking_confirmed:    { icon: 'checkmark-circle-outline', color: colors.success },
  application_approved: { icon: 'ribbon-outline',           color: colors.accent  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export function NotificationsModal({ visible, onClose, onUnreadChange }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getMyNotifications();
    setNotifications(data);
    setLoading(false);
    onUnreadChange?.(data.filter(n => !n.read).length);
  }, [onUnreadChange]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  useEffect(() => {
    const channel = supabase
      .channel('notif_modal')
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
      onUnreadChange?.(notifications.filter(x => !x.read && x.id !== n.id).length);
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
    onUnreadChange?.(0);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Handle */}
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Notificaciones</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAll} activeOpacity={0.7}>
                      <Text style={styles.markAllText}>Leer todo</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Content */}
              {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={n => n.id}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} style={{ marginBottom: 10 }} />
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
                          <Ionicons name={meta.icon} size={20} color={meta.color} />
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
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.textMain },
  markAllText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: `${colors.textMuted}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  notifCardUnread: {
    borderColor: `${colors.primary}40`,
    backgroundColor: `${colors.primary}06`,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifTitle: { fontSize: 14, fontWeight: '600', color: colors.textMain, marginBottom: 3 },
  notifTitleUnread: { fontWeight: '800' },
  notifBody: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4, flexShrink: 0,
  },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
