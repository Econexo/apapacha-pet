import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { NotificationsModal } from '../components/NotificationsModal';
import { colors } from '../theme/colors';
import { radii, shadows, label } from '../theme/design';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../../supabase';
import type { RootStackParamList } from '../types/navigation';
import type { Pet, Booking, PetReport } from '../types/database';
import { getUnreadCount } from '../services/notifications.service';
import { getLatestPetReport, moodIcon, moodLabel } from '../services/petReports.service';
import { OverlayModal } from '../components/OverlayModal';
import { AddPetScreen } from './AddPetScreen';
import { AppText } from '../components/ui/AppText';
import { ScreenBackground } from '../components/ui/ScreenBackground';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Hace cuánto se envió el reporte, en lenguaje corto.
function haceCuanto(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuth();
  const toast = useToast();
  const [pets, setPets] = useState<Pet[]>([]);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [petReport, setPetReport] = useState<PetReport | null>(null);
  const [nextServiceName, setNextServiceName] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [addPetId, setAddPetId] = useState<string | undefined>();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: petsData }, { data: bookingsData }] = await Promise.all([
        supabase.from('pets').select('*').eq('owner_id', user.id).order('created_at'),
        supabase.from('bookings')
          .select('*')
          .eq('owner_id', user.id)
          .in('status', ['pending', 'active'])
          .order('start_date')
          .limit(1),
      ]);
      setPets(petsData ?? []);
      const booking = bookingsData?.[0] ?? null;
      setNextBooking(booking);
      if (booking) {
        const table = booking.service_type === 'space' ? 'spaces' : 'visiters';
        const field = booking.service_type === 'space' ? 'title' : 'name';
        const { data: svc } = await supabase.from(table).select(field).eq('id', booking.service_id).single();
        setNextServiceName(svc ? (svc as any)[field] : null);
      } else {
        setNextServiceName(null);
      }
    } catch (e) { console.error('[HomeScreen]', e); }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
    getUnreadCount().then(setUnreadCount);
  }, []));

  useEffect(() => {
    const channel = supabase
      .channel('home_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        getUnreadCount().then(setUnreadCount);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'amigo';
  const firstPet = pets[0];
  // OJO: status 'active' significa "confirmada y pagada", NO "en curso". El
  // servicio empieza cuando el cuidador pulsa Iniciar, que es lo que pone
  // service_phase='in_progress' (host.service.startService). Confundir ambos
  // hacía que al cliente le apareciera "Tu cuidador está con tus gatos" sin que
  // el cuidador hubiera empezado siquiera.
  const confirmada = nextBooking?.status === 'active';
  const enCurso = confirmada && nextBooking?.service_phase === 'in_progress';

  // El reporte del cuidador solo existe con el servicio ya empezado.
  useEffect(() => {
    if (!enCurso || !nextBooking) { setPetReport(null); return; }
    getLatestPetReport(nextBooking.id).then(setPetReport).catch(() => {});
  }, [enCurso, nextBooking?.id]);

  const smartAlerts: { key: string; type: 'info' | 'success' | 'warning'; icon: string; message: string }[] = [];
  if (nextBooking) {
    if (enCurso) {
      smartAlerts.push({ key: 'active', type: 'success', icon: '🟢', message: `Servicio en curso${nextServiceName ? ` en "${nextServiceName}"` : ''}. Tu cuidador está con tus gatos.` });
    } else if (confirmada) {
      smartAlerts.push({ key: 'confirmed', type: 'info', icon: '✅', message: `Reserva confirmada${nextServiceName ? ` en "${nextServiceName}"` : ''}. Tu cuidador aún no ha iniciado el servicio.` });
    } else {
      const daysUntil = Math.ceil((new Date(nextBooking.start_date).getTime() - Date.now()) / 86400000);
      if (daysUntil === 0) smartAlerts.push({ key: 'today', type: 'warning', icon: '⚡', message: '¡Tu reserva empieza hoy! Asegúrate de coordinar con tu cuidador.' });
      else if (daysUntil === 1) smartAlerts.push({ key: 'tomorrow', type: 'info', icon: '📅', message: 'Tienes una reserva mañana. ¿Ya está todo listo para tu gato?' });
    }
  }
  const visibleAlerts = smartAlerts.filter(a => !dismissedAlerts.has(a.key));

  const bellIcon = (
    <TouchableOpacity
      onPress={() => setShowNotifications(true)}
      style={{ padding: 6, position: 'relative' }}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.primary} />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute', top: 2, right: 2,
          backgroundColor: colors.danger, borderRadius: 8,
          minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
        }}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <AppHeader rightElement={bellIcon} />
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadChange={setUnreadCount}
      />
      <OverlayModal visible={showAddPet} onClose={() => setShowAddPet(false)}>
        <AddPetScreen petId={addPetId} onClose={() => { setShowAddPet(false); loadData(); }} />
      </OverlayModal>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText variant="display1" style={{ marginTop: 8, marginBottom: 4 }}>Hola, {firstName}</AppText>
        <AppText variant="body" color={colors.textMuted} style={{ marginBottom: 8 }}>¿Cómo están tus compañeros felinos hoy?</AppText>

        {visibleAlerts.map(alert => {
          const alertColors = {
            success: { bg: '#F0FBF0', border: '#B8E6B9', text: '#1A4A1B' },
            warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
            info:    { bg: '#EFF8FC', border: '#B3DCE8', text: '#1E5F75' },
          }[alert.type];
          return (
            <View key={alert.key} style={[styles.smartAlert, { backgroundColor: alertColors.bg, borderColor: alertColors.border }]}>
              <Text style={styles.smartAlertIcon}>{alert.icon}</Text>
              <Text style={[styles.smartAlertText, { color: alertColors.text }]}>{alert.message}</Text>
              <TouchableOpacity onPress={() => setDismissedAlerts(prev => new Set([...prev, alert.key]))} activeOpacity={0.7}>
                <Ionicons name="close" size={16} color={alertColors.text} />
              </TouchableOpacity>
            </View>
          );
        })}

        {firstPet ? (
          <View style={styles.petCard}>
            {/* Photo */}
            {firstPet.image_url ? (
              <Image source={{ uri: firstPet.image_url }} style={styles.petPhoto} />
            ) : (
              <View style={styles.petPhotoPlaceholder}>
                <Text style={styles.petPhotoEmoji}>🐱</Text>
              </View>
            )}
            <View style={styles.petCardBody}>
              <AppText variant="title" style={{ fontSize: 19 }}>{firstPet.name}</AppText>
              <Text style={styles.petBreed}>{firstPet.breed || 'Gato'} · {firstPet.age_years} año{firstPet.age_years !== 1 ? 's' : ''}</Text>

              {/* Reporte real del cuidador, solo con el servicio ya iniciado.
                  Antes aquí se mostraba un ánimo inventado a partir del UUID. */}
              {enCurso && petReport ? (
                <View style={styles.moodBadge}>
                  <Text style={styles.moodLabel}>Reporte del cuidador · {haceCuanto(petReport.created_at)}</Text>
                  <View style={styles.moodRow}>
                    <Ionicons name={moodIcon(petReport.mood)} size={22} color={colors.primaryDark} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moodMain}>{moodLabel(petReport.mood)}</Text>
                      {!!petReport.note && <Text style={styles.moodSub}>{petReport.note}</Text>}
                    </View>
                    {!!petReport.photo_url && (
                      <TouchableOpacity
                        onPress={() => Platform.OS === 'web' ? window.open(petReport.photo_url!, '_blank') : undefined}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: petReport.photo_url }} style={styles.moodPhoto} resizeMode="cover" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : enCurso ? (
                <View style={styles.moodBadge}>
                  <Text style={styles.moodLabel}>Reporte del cuidador</Text>
                  <Text style={styles.moodSub}>Tu cuidador aún no ha enviado un reporte.</Text>
                </View>
              ) : firstPet.medical_alerts?.length > 0 ? (
                <View style={styles.alertBadge}>
                  <Text style={styles.alertText}>⚠️ {firstPet.medical_alerts[0]}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addPetCard} onPress={() => { setAddPetId(undefined); setShowAddPet(true); }} activeOpacity={0.8}>
            <Text style={styles.addPetEmoji}>🐱</Text>
            <Text style={styles.addPetText}>Agrega tu primer gato</Text>
            <Text style={styles.addPetArrow}>→</Text>
          </TouchableOpacity>
        )}

        {nextBooking ? (
          <View style={[styles.visitCard, enCurso && styles.visitCardActive]}>
            <Text style={styles.visitLabel}>{enCurso ? 'Servicio en curso' : 'Próxima reserva'}</Text>
            {nextServiceName && <Text style={styles.visitServiceName}>{nextServiceName}</Text>}
            <Text style={styles.visitDates}>
              {new Date(nextBooking.start_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
              {' — '}
              {new Date(nextBooking.end_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
            </Text>
            <View style={styles.visitStatusRow}>
              <View style={[styles.statusDot, enCurso ? styles.statusDotActive : styles.statusDotPending]} />
              <Text style={styles.visitStatus}>
                {enCurso ? 'En curso' : confirmada ? 'Confirmada · por iniciar' : 'Pendiente confirmación'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noVisitCard}>
            <Text style={styles.noVisitText}>Sin reservas próximas</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Explore' })} activeOpacity={0.8}>
              <Text style={styles.noVisitLink}>Buscar cuidadores →</Text>
            </TouchableOpacity>
          </View>
        )}

        <AppText variant="title" style={{ marginTop: 24, marginBottom: 14 }}>Acciones rápidas</AppText>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Explore' })} activeOpacity={0.8}>
            <Ionicons name="search" size={28} color={colors.primary} />
            <Text selectable={false} style={styles.actionLabel}>Reservar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Bookings' })} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={28} color={colors.primary} />
            <Text selectable={false} style={styles.actionLabel}>Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => { setAddPetId(firstPet?.id); setShowAddPet(true); }} activeOpacity={0.8}>
            <Ionicons name="paw-outline" size={28} color={colors.primary} />
            <Text selectable={false} style={styles.actionLabel}>{firstPet ? firstPet.name : 'Mi gato'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardDanger]}
            onPress={() => {
              toast.warning('Emergencia Veterinaria', 'Contacta a tu veterinario de confianza o escríbenos a apapachapet.app@gmail.com');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="warning-outline" size={28} color={colors.dangerText} />
            <Text selectable={false} style={[styles.actionLabel, styles.actionLabelDanger]}>Emergencia</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 100 },
  greeting: { fontSize: 28, fontWeight: '900', color: colors.textMain, marginTop: 8, marginBottom: 4, letterSpacing: -0.5 },
  subGreeting: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },

  smartAlert: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderRadius: radii.lg, padding: 14, marginBottom: 12,
  },
  smartAlertIcon: { fontSize: 16, marginTop: 1 },
  smartAlertText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },

  // Pet card
  petCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, flexDirection: 'row', alignItems: 'flex-start', ...shadows.md, marginBottom: 12, gap: 14 },
  petPhoto: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.background },
  petPhotoPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  petPhotoEmoji: { fontSize: 36 },
  petCardBody: { flex: 1, gap: 4 },
  petName: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  petBreed: { fontSize: 13, color: colors.textMuted },
  moodBadge: { backgroundColor: `${colors.primary}10`, borderRadius: radii.md, padding: 10, marginTop: 6 },
  moodLabel: { ...label, color: colors.primaryDark, marginBottom: 5 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodEmoji: { fontSize: 26 },
  moodMain: { fontSize: 14, fontWeight: '800', color: colors.textMain },
  moodSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  alertBadge: { backgroundColor: colors.dangerBg, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  alertText: { fontSize: 11, color: colors.dangerText, fontWeight: '700' },

  addPetCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed', marginBottom: 12, gap: 12 },
  addPetEmoji: { fontSize: 28 },
  addPetText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  addPetArrow: { fontSize: 18, color: colors.primary },

  // Visit card
  visitCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, ...shadows.md, marginBottom: 24, gap: 4 },
  visitCardActive: { backgroundColor: colors.successBg },
  visitLabel: { ...label, color: colors.textMuted },
  visitServiceName: { fontSize: 15, fontWeight: '700', color: colors.textMain, marginTop: 2 },
  visitDates: { fontSize: 20, fontWeight: '800', color: colors.textMain },
  visitStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotActive: { backgroundColor: colors.successText },
  statusDotPending: { backgroundColor: colors.primary },
  visitStatus: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  noVisitCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, ...shadows.sm, marginBottom: 24, alignItems: 'center', gap: 8 },
  noVisitText: { fontSize: 14, color: colors.textMuted },
  noVisitLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },

  actionsTitle: { ...label, color: colors.textMuted, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { flex: 1, minWidth: '44%', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 20, alignItems: 'center', gap: 8, ...shadows.sm },
  actionCardDanger: { backgroundColor: colors.dangerBg },
  actionEmoji: { fontSize: 28 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMain },
  actionLabelDanger: { color: colors.dangerText },
});
