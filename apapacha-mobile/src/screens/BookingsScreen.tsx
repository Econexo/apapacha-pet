import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

const MOCK_BOOKINGS = [
  {
    id: '1',
    spaceName: 'Depto Malla Completa Centro',
    sitter: 'María',
    status: 'ACTIVE',
    date: '10 Abril - 15 Abril',
    pet: 'Michi'
  },
  {
    id: '2',
    spaceName: 'Casa con Patio Cerrado',
    sitter: 'Dr. Rodrigo',
    status: 'COMPLETED',
    date: '02 Enero - 05 Enero',
    pet: 'Michi'
  }
];

export function BookingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Reservas</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Próximas y Activas</Text>
        
        {MOCK_BOOKINGS.filter(b => b.status === 'ACTIVE').map(booking => (
          <TouchableOpacity key={booking.id} style={styles.card} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
              <View style={[styles.statusBadge, styles.statusActive]}>
                <Text style={styles.statusTextActive}>• En Curso</Text>
              </View>
              <Text style={styles.dateText}>{booking.date}</Text>
            </View>
            <Text style={styles.spaceName}>{booking.spaceName}</Text>
            <Text style={styles.sitterText}>Huésped: {booking.pet} • Cuidador: {booking.sitter}</Text>
            <View style={styles.actionRow}>
              <Text style={styles.actionText}>Ver Monitoreo en Vivo →</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Historial</Text>
        
        {MOCK_BOOKINGS.filter(b => b.status === 'COMPLETED').map(booking => (
          <View key={booking.id} style={[styles.card, styles.cardCompleted]}>
            <View style={styles.cardHeader}>
              <View style={[styles.statusBadge, styles.statusCompleted]}>
                <Text style={styles.statusTextCompleted}>Finalizada</Text>
              </View>
              <Text style={styles.dateText}>{booking.date}</Text>
            </View>
            <Text style={styles.spaceName}>{booking.spaceName}</Text>
            <Text style={styles.sitterText}>Huésped: {booking.pet} • Cuidador: {booking.sitter}</Text>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMain,
    letterSpacing: -0.5,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCompleted: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: `${colors.primary}15`,
  },
  statusCompleted: {
    backgroundColor: colors.border,
  },
  statusTextActive: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  spaceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
  },
  sitterText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  actionRow: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  actionText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  }
});
