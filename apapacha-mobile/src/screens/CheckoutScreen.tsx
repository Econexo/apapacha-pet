import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/Toast';
import type { RootStackParamList } from '../types/navigation';
import type { Space, Visiter, Pet } from '../types/database';
import { getSpaceById } from '../services/spaces.service';
import { getVisiterById } from '../services/visiters.service';
import { getMyPets } from '../services/pets.service';
import { createBooking } from '../services/bookings.service';
import { DateRangePicker } from '../components/DateRangePicker';
import { VisitScheduler } from '../components/VisitScheduler';
import { supabase } from '../../supabase';
import { normalizeAvailability, isDayAvailable, toISODate, parseISODate } from '../lib/availability';
import { APP_FEE, INSURANCE_FEE } from '../lib/cancellation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Checkout'>;

const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`;

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { id, type } = route.params;
  const toast = useToast();

  const [service, setService] = useState<Space | Visiter | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);

  const defaultCheckIn = new Date(); defaultCheckIn.setHours(0,0,0,0);
  defaultCheckIn.setDate(defaultCheckIn.getDate() + 1);
  const defaultCheckOut = new Date(defaultCheckIn); defaultCheckOut.setDate(defaultCheckOut.getDate() + 2);

  const [checkIn, setCheckIn]   = useState<Date>(defaultCheckIn);
  const [checkOut, setCheckOut] = useState<Date>(defaultCheckOut);
  const [occupied, setOccupied] = useState<Set<string>>(new Set());

  // Visitas: fechas puntuales + hora (no un rango de noches)
  const [visitDates, setVisitDates] = useState<string[]>([]);
  const [visitTime, setVisitTime]   = useState<string | null>(null);
  const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set());

  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));
  const startDate = checkIn.toISOString().split('T')[0];
  const endDate   = checkOut.toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([
      type === 'space' ? getSpaceById(id) : getVisiterById(id),
      getMyPets(),
    ])
      .then(([svc, myPets]) => {
        setService(svc);
        setPets(myPets);
        if (myPets.length > 0) setSelectedPet(myPets[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, type]);

  // Fechas ya ocupadas (solo alojamiento: reserva exclusiva). RPC expone solo rangos, sin PII.
  useEffect(() => {
    if (type !== 'space') return;
    (async () => {
      const { data, error } = await supabase.rpc('get_service_booked_dates', { p_service_type: type, p_service_id: id });
      if (error) { console.error(error); return; }
      const set = new Set<string>();
      for (const r of (data ?? []) as { start_date: string; end_date: string }[]) {
        for (const d = parseISODate(r.start_date); d < parseISODate(r.end_date); d.setDate(d.getDate() + 1)) {
          set.add(toISODate(d));
        }
      }
      setOccupied(set);
    })();
  }, [id, type]);

  // Slots ya tomados del cuidador (solo visitas). RPC expone solo fecha+hora, sin PII.
  useEffect(() => {
    if (type !== 'visiter') return;
    (async () => {
      const { data, error } = await supabase.rpc('get_visiter_taken_slots', { p_visiter_id: id });
      if (error) { console.error(error); return; }
      const set = new Set<string>();
      for (const r of (data ?? []) as { slot_date: string; slot_time: string }[]) {
        if (r.slot_time) set.add(`${r.slot_date}|${r.slot_time.slice(0, 5)}`);
      }
      setTakenSlots(set);
    })();
  }, [id, type]);

  const availability = normalizeAvailability((service as any)?.availability);
  const isDateBlocked = (d: Date) =>
    !isDayAvailable(availability, d) || (type === 'space' && occupied.has(toISODate(d)));

  const basePrice = service
    ? type === 'space'
      ? (service as Space).price_per_night * nights
      : (service as Visiter).price_per_visit * visitDates.length
    : 0;
  const grandTotal = basePrice + APP_FEE + INSURANCE_FEE;

  const handleConfirm = async () => {
    if (type === 'space') {
      if (checkOut <= checkIn) {
        toast.warning('Fechas inválidas', 'La fecha de salida debe ser posterior a la de llegada.');
        return;
      }
    } else {
      if (visitDates.length === 0) {
        toast.warning('Falta la fecha', 'Selecciona al menos un día para la visita.');
        return;
      }
      if (!visitTime) {
        toast.warning('Falta la hora', 'Selecciona el horario de la visita.');
        return;
      }
    }
    if (!selectedPet) {
      toast.warning('Mascota requerida', 'Añade una mascota en tu perfil antes de reservar.');
      return;
    }
    setSubmitting(true);
    try {
      // Visitas: start/end = min/max de las fechas elegidas (compatibilidad de listados)
      const sorted = [...visitDates].sort();
      const booking = await createBooking({
        pet_id: selectedPet.id,
        service_type: type,
        service_id: id,
        start_date: type === 'space' ? startDate : sorted[0],
        end_date:   type === 'space' ? endDate   : sorted[sorted.length - 1],
        total_price: grandTotal,
        ...(type === 'visiter' && { visit_dates: sorted, start_time: visitTime! }),
      });
      // El pago ocurre DESPUÉS de que el cuidador acepte la solicitud.
      toast.success('¡Solicitud enviada!', 'El cuidador debe aceptar tu reserva. Te avisaremos para que subas tu comprobante de pago.');
      navigation.navigate('MainTabs', { screen: 'Bookings' } as any);
    } catch (e: any) {
      toast.error('Error', e.message ?? 'No se pudo confirmar la reserva');
    } finally {
      setSubmitting(false);
    }
  };

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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmar Reserva</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {service && (
          <View style={styles.serviceCard}>
            <Image
              source={{ uri: type === 'space' ? ((service as Space).image_urls?.[0] ?? 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800') : ((service as Visiter).image_url ?? 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800') }}
              style={styles.serviceImage}
            />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceSubtitle}>{type === 'space' ? 'Hospedaje' : 'Visita Domiciliaria'}</Text>
              <Text style={styles.serviceTitle}>
                {type === 'space' ? (service as Space).title : (service as Visiter).name}
              </Text>
              <Text style={styles.serviceRating}>{service.rating > 0 ? `⭐ ${service.rating}` : '✨ Nuevo'}</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Tu Reserva</Text>
          {type === 'space' ? (
            <DateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onChangeCheckIn={setCheckIn}
              onChangeCheckOut={setCheckOut}
              isDateBlocked={isDateBlocked}
            />
          ) : (
            <VisitScheduler
              availability={availability}
              selectedDates={visitDates}
              selectedTime={visitTime}
              takenSlots={takenSlots}
              onChangeDates={setVisitDates}
              onChangeTime={setVisitTime}
            />
          )}

          {/* Pet selector */}
          <Text style={[styles.rowTitle, { marginTop: 16, marginBottom: 10 }]}>Huésped</Text>
          {pets.length === 0 ? (
            <View style={styles.noPetBanner}>
              <Text style={styles.noPetText}>⚠️ No tienes mascotas registradas. Añade una en tu perfil.</Text>
            </View>
          ) : (
            <View style={styles.petSelectorRow}>
              {pets.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.petChip, selectedPet?.id === p.id && styles.petChipActive]}
                  onPress={() => setSelectedPet(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.petChipText, selectedPet?.id === p.id && styles.petChipTextActive]}>
                    🐱 {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Detalle de Precios</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceConcept}>
              {type === 'space'
                ? `${fmt((service as Space)?.price_per_night ?? 0)} x ${nights} noches`
                : `${fmt((service as Visiter)?.price_per_visit ?? 0)} x ${visitDates.length} visita${visitDates.length === 1 ? '' : 's'}${visitTime ? ` · ${visitTime}` : ''}`}
            </Text>
            <Text style={styles.priceNumber}>{fmt(basePrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceConcept}>Tarifa de Servicio (ApapachaPet)</Text>
            <Text style={styles.priceNumber}>{fmt(APP_FEE)}</Text>
          </View>
          <TouchableOpacity
            style={styles.priceRow}
            onPress={() => setInsuranceOpen(o => !o)}
            activeOpacity={0.7}
          >
            <Text style={[styles.priceConcept, { color: colors.accent, fontWeight: '600' }]}>
              Malla de Seguro Zero Trust  {insuranceOpen ? 'ⓘ ▲' : 'ⓘ ▼'}
            </Text>
            <Text style={styles.priceNumber}>{fmt(INSURANCE_FEE)}</Text>
          </TouchableOpacity>

          {insuranceOpen && (
            <View style={styles.insuranceInfo}>
              <Text style={styles.insuranceInfoTitle}>🛡️ ¿Qué es y por qué se cobra aparte?</Text>
              <Text style={styles.insuranceInfoText}>
                La Malla de Seguro Zero Trust es una <Text style={{ fontWeight: '700' }}>cobertura veterinaria</Text> que protege a tu gato durante todo el servicio. Si ocurre un accidente o emergencia de salud mientras está al cuidado, cubrimos la atención veterinaria hasta el límite de la póliza.
              </Text>
              <Text style={styles.insuranceInfoText}>
                Se cobra por separado del cuidador porque <Text style={{ fontWeight: '700' }}>no es parte de su tarifa</Text>: es una protección que ApapachaPet contrata directamente por cada reserva. Así el 100% de este monto va al respaldo de tu mascota, no al cuidador.
              </Text>
              <Text style={styles.insuranceInfoBullet}>• Cubre urgencias veterinarias durante el servicio</Text>
              <Text style={styles.insuranceInfoBullet}>• Válida solo si la información médica de tu gato es real</Text>
              <Text style={styles.insuranceInfoBullet}>• No es reembolsable en caso de cancelación</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total (CLP)</Text>
            <Text style={styles.totalValue}>{fmt(grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.paymentNote}>
          <Ionicons name="card-outline" size={22} color={colors.primary} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.paymentNoteTitle}>Solicitud → aceptación → pago</Text>
            <Text style={styles.paymentNoteText}>
              Enviaremos tu solicitud al cuidador. Cuando la acepte, te avisaremos para que subas tu comprobante de transferencia desde Reservas. El servicio se activa al confirmar el pago.
            </Text>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Política de Cancelación Estricta</Text>
          <Text style={styles.policyText}>El Seguro Zero Trust no es reembolsable.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Enviar solicitud" icon="paper-plane" loading={submitting} onPress={handleConfirm} style={{ width: '100%' }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary },
  headerTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.textMain },
  content: { padding: 20, paddingBottom: 80 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 24 },
  serviceImage: { width: 100, height: 80, borderRadius: 8, marginRight: 16 },
  serviceInfo: { flex: 1 },
  serviceSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  serviceRating: { fontSize: 12, fontWeight: '600', color: colors.textMain },
  sectionBlock: { marginBottom: 16 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.textMain, marginBottom: 16, letterSpacing: -0.2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.textMain },
  rowValue: { fontSize: 15, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 8, marginBottom: 24 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  priceConcept: { fontSize: 15, color: colors.textMuted },
  priceNumber: { fontSize: 15, color: colors.textMain },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  totalValue: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  paymentNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.infoBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.infoBorder, marginBottom: 24, gap: 12 },
  paymentNoteIcon: { fontSize: 22 },
  paymentNoteTitle: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  paymentNoteText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  policyText: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  insuranceInfo: { backgroundColor: colors.infoBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.infoBorder, marginTop: 4, marginBottom: 8, gap: 8 },
  insuranceInfoTitle: { fontSize: 14, fontWeight: '800', color: colors.textMain },
  insuranceInfoText: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  insuranceInfoBullet: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
  noPetBanner: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.dangerBorder },
  noPetText: { fontSize: 13, color: colors.dangerText, fontWeight: '600' },
  petSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  petChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  petChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  petChipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  petChipTextActive: { color: colors.primaryDark, fontWeight: '800' },
});
