import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';

export function HostDashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Modo Cuidador Experto</Text>
        <Text style={styles.headerTitle}>Panel de Control</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Métricas o Resumen */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>1</Text>
            <Text style={styles.metricLabel}>Huésped Activo</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>3</Text>
            <Text style={styles.metricLabel}>Pendientes</Text>
          </View>
        </View>

        {/* Huéspedes Actuales */}
        <Text style={styles.sectionTitle}>Acción Requerida Hoy</Text>
        
        <View style={styles.activeGuestCard}>
          <View style={styles.activeHeader}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>Estancia en Curso</Text>
          </View>
          <View style={styles.guestInfoRow}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?q=80&w=300&auto=format&fit=crop' }} 
              style={styles.guestAvatar} 
            />
            <View style={styles.guestDetails}>
              <Text style={styles.guestName}>Michi</Text>
              <Text style={styles.guestOwner}>Dueño: Carlos Gómez</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logButton}>
            <Text style={styles.logButtonText}>+ Registrar Novedad / Enviar Foto</Text>
          </TouchableOpacity>
        </View>

        {/* Solicitudes de Reserva */}
        <Text style={styles.sectionTitle}>Solicitudes de Ingreso</Text>

        <View style={styles.requestCard}>
          <Text style={styles.requestDate}>Del 20 May al 25 May</Text>
          <Text style={styles.requestTitle}>Garfield • 5 años, Persa</Text>
          
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>Requiere medicación oral.</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]}>
              <Text style={styles.actionBtnOutlineText}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnFilled]}>
              <Text style={styles.actionBtnFilledText}>Revisar Ficha Médica</Text>
            </TouchableOpacity>
          </View>
        </View>

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
    paddingBottom: 16,
    backgroundColor: colors.primaryDark,
  },
  headerSubtitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -0.5,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 16,
  },
  activeGuestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: 8,
  },
  liveText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  guestInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  guestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
  },
  guestDetails: {
    flex: 1,
  },
  guestName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  guestOwner: {
    fontSize: 13,
    color: colors.textMuted,
  },
  logButton: {
    backgroundColor: `${colors.primary}15`,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  logButtonText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  requestDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 2,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 8,
  },
  alertBox: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FCA5A5',
    marginBottom: 16,
  },
  alertText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnFilled: {
    backgroundColor: colors.primary,
  },
  actionBtnOutlineText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  actionBtnFilledText: {
    color: colors.surface,
    fontWeight: '600',
  }
});
