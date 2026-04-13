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

export function InboxScreen() {
  const navigation = useNavigation<Nav>();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useFocusEffect(
    useCallback(() => {
      getMyBookings()
        .then(data => setBookings(data.filter(b => b.status === 'active' || b.status === 'pending')))
        .catch(console.error);
    }, [])
  );

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ChatDetail', { id: item.id })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{item.service_type === 'space' ? '🏠' : '🚗'}</Text>
            </View>
            <View style={styles.messageContent}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {item.service_type === 'space' ? 'Alojamiento' : 'Visita Domiciliaria'}
                </Text>
                <Text style={styles.time}>{fmt(item.start_date)}</Text>
              </View>
              <Text style={styles.snippet} numberOfLines={1}>
                {item.status === 'pending' ? 'Esperando confirmación...' : 'Reserva activa — toca para chatear'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No tienes mensajes aún.</Text>
          </View>
        }
        contentContainerStyle={bookings.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textMain, letterSpacing: -0.5 },
  chatRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 28 },
  messageContent: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, color: colors.textMain, fontWeight: '700' },
  time: { fontSize: 13, color: colors.textMuted },
  snippet: { flex: 1, fontSize: 14, color: colors.textMuted },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
});
