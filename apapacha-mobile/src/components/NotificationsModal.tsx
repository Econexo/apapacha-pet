import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback,
  FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { supabase } from '../../supabase';
import { getMyNotifications, markAsRead, markAllAsRead } from '../services/notifications.service';
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
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop invisible — cierra al tocar fuera */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          {/* Dropdown card — bloquea el toque para no cerrar */}
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Notificaciones</Text>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAll} activeOpacity={0.7}>
                    <Text style={styles.markAllText}>Leer todo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Content */}
              {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={n => n.id}
                  style={{ maxHeight: 420 }}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
                      <Text style={styles.emptyText}>Sin notificaciones</Text>
                    </View>
                  }
                  renderItem={({ item: n }) => {
                    const meta = TYPE_ICON[n.type] ?? { icon: 'notifications-outline' as IoniconName, color: colors.primary };
                    return (
                      <TouchableOpacity
                        style={[styles.notifRow, !n.read && styles.notifRowUnread]}
                        onPress={() => handleTap(n)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
                          <Ionicons name={meta.icon} size={18} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.notifTitle, !n.read && styles.notifTitleBold]} numberOfLines={1}>
                            {n.title}
                          </Text>
                          <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                          <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
                        </View>
                        {!n.read && <View style={styles.dot} />}
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
    // Sin color de fondo — el toque fuera cierra pero no oscurece la pantalla
  },
  card: {
    position: 'absolute',
    top: 100,       // justo debajo del header (~56px header + safe area)
    right: 12,
    width: 320,
    backgroundColor: colors.surface,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 15, fontWeight: '800', color: colors.textMain },
  markAllText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  list: { paddingVertical: 6 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}80`,
  },
  notifRowUnread: {
    backgroundColor: `${colors.primary}06`,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifTitle: { fontSize: 13, fontWeight: '600', color: colors.textMain, marginBottom: 2 },
  notifTitleBold: { fontWeight: '800' },
  notifBody: { fontSize: 12, color: colors.textMuted, lineHeight: 16, marginBottom: 3 },
  notifTime: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4, flexShrink: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
});
