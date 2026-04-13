import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HostDashboardScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel de Cuidador</Text>
        <TouchableOpacity style={styles.exitBtn} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.exitBtnText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statNumber}>1</Text><Text style={styles.statLabel}>Huésped Activo</Text></View>
          <View style={styles.statCard}><Text style={styles.statNumber}>3</Text><Text style={styles.statLabel}>Pendientes</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Huésped Actual</Text>
        <View style={styles.activeGuestCard}>
          <View style={styles.guestHeader}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?q=80&w=300&auto=format&fit=crop' }} style={styles.guestImage} />
            <View>
              <Text style={styles.guestName}>Michi</Text>
              <Text style={styles.guestOwner}>Dueño: Carlos G.</Text>
            </View>
          </View>
          <View style={styles.alertBlock}>
            <Text style={styles.alertTitle}>⚠️ Alertas Activas</Text>
            <Text style={styles.alertText}>Dar pastilla a las 20:00 hrs.</Text>
          </View>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>📢 Registrar Evento / Enviar Foto</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Solicitudes Recientes</Text>
        <View style={styles.requestCard}>
          <Text style={styles.requestName}>Luna (2 Años)</Text>
          <Text style={styles.requestDates}>15 Abr - 18 Abr • 3 Noches</Text>
          <View style={styles.requestActions}>
            <TouchableOpacity style={[styles.reqBtn, styles.reqBtnAccept]}><Text style={styles.reqBtnText}>Aceptar</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.reqBtn, styles.reqBtnDecline]}><Text style={styles.reqBtnTextDecline}>Rechazar</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.surface },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textMain },
  exitBtn: { padding: 8, backgroundColor: colors.dangerBg, borderRadius: 8 },
  exitBtnText: { color: colors.danger, fontWeight: '700' },
  scrollContainer: { padding: 20 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statNumber: { fontSize: 32, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain, marginBottom: 16 },
  activeGuestCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: colors.primary, marginBottom: 32 },
  guestHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  guestImage: { width: 64, height: 64, borderRadius: 32, marginRight: 16 },
  guestName: { fontSize: 20, fontWeight: '800', color: colors.textMain },
  guestOwner: { fontSize: 14, color: colors.textMuted },
  alertBlock: { backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16 },
  alertTitle: { color: colors.dangerText, fontWeight: '700', marginBottom: 4 },
  alertText: { color: colors.dangerTextDark, fontSize: 13 },
  actionBtn: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: colors.surface, fontWeight: '700' },
  requestCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  requestName: { fontSize: 18, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  requestDates: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },
  requestActions: { flexDirection: 'row', gap: 12 },
  reqBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  reqBtnAccept: { backgroundColor: colors.success },
  reqBtnDecline: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  reqBtnText: { color: colors.surface, fontWeight: '700' },
  reqBtnTextDecline: { color: colors.textMuted, fontWeight: '700' },
});
