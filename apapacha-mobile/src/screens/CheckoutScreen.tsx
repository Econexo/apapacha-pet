import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Space, Visiter, Pet } from '../types/database';
import { getSpaceById } from '../services/spaces.service';
import { getVisiterById } from '../services/visiters.service';
import { getMyPets } from '../services/pets.service';
import { createBooking } from '../services/bookings.service';
import { createPaymentIntent } from '../services/payments.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Checkout'>;

const INSURANCE_FEE = 2500;
const APP_FEE = 4500;
const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`;

const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE';

// Lazy-load stripe-react-native only on native — it's not compatible with web bundler
let StripeProvider: any = null;
let useStripe: (() => any) | null = null;
if (Platform.OS !== 'web') {
  try {
    const mod = require('@stripe/stripe-react-native');
    StripeProvider = mod.StripeProvider;
    useStripe = mod.useStripe;
  } catch {
    // stripe-react-native not installed — native payments unavailable
  }
}

function CheckoutContent() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { id, type } = route.params;

  const [service, setService] = useState<Space | Visiter | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const stripe = useStripe ? useStripe() : null;

  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  const endDate = new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0];
  const nights = 2;

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

  const basePrice = service
    ? type === 'space'
      ? (service as Space).price_per_night * nights
      : (service as Visiter).price_per_visit
    : 0;
  const grandTotal = basePrice + APP_FEE + INSURANCE_FEE;

  const handleConfirm = async () => {
    if (!selectedPet) {
      Alert.alert('Mascota requerida', 'Añade una mascota en tu perfil antes de reservar.');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createBooking({
        pet_id: selectedPet.id,
        service_type: type,
        service_id: id,
        start_date: startDate,
        end_date: endDate,
        total_price: grandTotal,
      });

      if (Platform.OS === 'web') {
        // Web pilot: skip Stripe for now, go straight to success
        navigation.navigate('PaymentSuccess', { bookingId: booking.id });
        return;
      }

      // Native: Stripe Payment Sheet
      if (!stripe) {
        // Stripe not available — go to success directly (development mode)
        navigation.navigate('PaymentSuccess', { bookingId: booking.id });
        return;
      }

      const hostStripeAccountId = 'acct_placeholder'; // replaced when host has real Connect account
      const { clientSecret } = await createPaymentIntent(booking.id, hostStripeAccountId);

      const { error: initError } = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'ApapachaPet / RonRron',
        style: 'alwaysLight',
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await stripe.presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Error de pago', presentError.message);
        }
        return;
      }

      navigation.navigate('PaymentSuccess', { bookingId: booking.id });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo confirmar la reserva');
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
        <Text style={styles.headerTitle}>Confirmar y Pagar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {service && (
          <View style={styles.serviceCard}>
            <Image
              source={{ uri: type === 'space' ? (service as Space).image_urls[0] : ((service as Visiter).image_url ?? '') }}
              style={styles.serviceImage}
            />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceSubtitle}>{type === 'space' ? 'Hospedaje' : 'Visita Domiciliaria'}</Text>
              <Text style={styles.serviceTitle}>
                {type === 'space' ? (service as Space).title : (service as Visiter).name}
              </Text>
              <Text style={styles.serviceRating}>⭐ {service.rating}</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Tu Reserva</Text>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Fechas</Text>
            <Text style={styles.rowValue}>{startDate} - {endDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Huésped</Text>
            <Text style={styles.rowValue}>{selectedPet ? selectedPet.name : 'Sin mascota'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Detalle de Precios</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceConcept}>
              {type === 'space'
                ? `${fmt((service as Space)?.price_per_night ?? 0)} x ${nights} noches`
                : 'Visita domiciliaria'}
            </Text>
            <Text style={styles.priceNumber}>{fmt(basePrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceConcept}>Tarifa de Servicio (ApapachaPet)</Text>
            <Text style={styles.priceNumber}>{fmt(APP_FEE)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceConcept, { color: colors.accent, fontWeight: '600' }]}>Malla de Seguro Zero Trust</Text>
            <Text style={styles.priceNumber}>{fmt(INSURANCE_FEE)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total (CLP)</Text>
            <Text style={styles.totalValue}>{fmt(grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Política de Cancelación Estricta</Text>
          <Text style={styles.policyText}>El Seguro Zero Trust no es reembolsable.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleConfirm}
          activeOpacity={0.8}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.submitBtnText}>Pagar con Stripe</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export function CheckoutScreen() {
  if (Platform.OS === 'web' || !StripeProvider) {
    return <CheckoutContent />;
  }
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <CheckoutContent />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  content: { padding: 20, paddingBottom: 80 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 24 },
  serviceImage: { width: 100, height: 80, borderRadius: 8, marginRight: 16 },
  serviceInfo: { flex: 1 },
  serviceSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  serviceRating: { fontSize: 12, fontWeight: '600', color: colors.textMain },
  sectionBlock: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.textMain, marginBottom: 16 },
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
  policyText: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
