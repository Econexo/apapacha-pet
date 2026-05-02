import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../supabase';
import type { RootStackParamList } from '../types/navigation';
import type { Pet, Booking } from '../types/database';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MOOD_STATES = [
  { emoji: '😸', label: 'Muy juguetón', energy: 'Alta',  stress: 'Bajo'  },
  { emoji: '😺', label: 'Tranquilo',    energy: 'Media', stress: 'Bajo'  },
  { emoji: '😻', label: 'Feliz',        energy: 'Alta',  stress: 'Nulo'  },
  { emoji: '😴', label: 'Descansando',  energy: 'Baja',  stress: 'Nulo'  },
  { emoji: '😼', label: 'Curioso',      energy: 'Media', stress: 'Bajo'  },
];

function getMoodForPet(pet: Pet) {
  return MOOD_STATES[pet.id.charCodeAt(2) % MOOD_STATES.length];
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);

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
      setNextBooking(bookingsData?.[0] ?? null);
    } catch (_) {}
  }, []);

  useEffect(() => { loadData(); }, []);
  useFocusEffect(useCallback(() => { loadData(); }, []));

  const firstName = profile?.full_name?.split(' ')[0] ?? 'amigo';
  const firstPet = pets[0];
  const isActive = nextBooking?.status === 'active';
  const mood = firstPet ? getMoodForPet(firstPet) : null;

  return (
    <View style={styles.root}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Hola, {firstName} 🐾</Text>
        <Text style={styles.subGreeting}>¿Cómo están tus compañeros felinos hoy?</Text>

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
              <Text style={styles.petName}>{firstPet.name}</Text>
              <Text style={styles.petBreed}>{firstPet.breed || 'Gato'} · {firstPet.age_years} año{firstPet.age_years !== 1 ? 's' : ''}</Text>

              {/* Estado — visible cuando hay reserva activa */}
              {isActive && mood ? (
                <View style={styles.moodBadge}>
                  <Text style={styles.moodLabel}>Estado actual</Text>
                  <View style={styles.moodRow}>
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <View>
                      <Text style={styles.moodMain}>{mood.label}</Text>
                      <Text style={styles.moodSub}>⚡ Energía {mood.energy} · 😌 Estrés {mood.stress}</Text>
                    </View>
                  </View>
                </View>
              ) : firstPet.medical_alerts?.length > 0 ? (
                <View style={styles.alertBadge}>
                  <Text style={styles.alertText}>⚠️ {firstPet.medical_alerts[0]}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addPetCard} onPress={() => navigation.navigate('AddPetModal')} activeOpacity={0.8}>
            <Text style={styles.addPetEmoji}>🐱</Text>
            <Text style={styles.addPetText}>Agrega tu primer gato</Text>
            <Text style={styles.addPetArrow}>→</Text>
          </TouchableOpacity>
        )}

        {nextBooking ? (
          <View style={[styles.visitCard, isActive && styles.visitCardActive]}>
            <Text style={styles.visitLabel}>{isActive ? 'Servicio en curso' : 'Próxima reserva'}</Text>
            <Text style={styles.visitDates}>
              {new Date(nextBooking.start_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
              {' — '}
              {new Date(nextBooking.end_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
            </Text>
            <View style={styles.visitStatusRow}>
              <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotPending]} />
              <Text style={styles.visitStatus}>{isActive ? '🟢 En curso' : 'Pendiente confirmación'}</Text>
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

        <Text style={styles.actionsTitle}>Acciones rápidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Explore' })} activeOpacity={0.8}>
            <Ionicons name="search" size={28} color={colors.primary} />
            <Text style={styles.actionLabel}>Reservar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Bookings' })} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={28} color={colors.primary} />
            <Text style={styles.actionLabel}>Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => firstPet ? navigation.navigate('AddPetModal', { petId: firstPet.id }) : navigation.navigate('AddPetModal')} activeOpacity={0.8}>
            <Ionicons name="paw-outline" size={28} color={colors.primary} />
            <Text style={styles.actionLabel}>{firstPet ? firstPet.name : 'Mi gato'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardDanger]}
            onPress={() => Alert.alert('Emergencia Veterinaria', 'Contacta a tu veterinario de confianza o escríbenos a apapachapet.app@gmail.com', [{ text: 'Entendido' }])}
            activeOpacity={0.8}
          >
            <Ionicons name="warning-outline" size={28} color={colors.dangerText} />
            <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Emergencia</Text>
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
  subGreeting: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },

  // Pet card
  petCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: colors.border, marginBottom: 12, gap: 14 },
  petPhoto: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.background },
  petPhotoPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  petPhotoEmoji: { fontSize: 36 },
  petCardBody: { flex: 1, gap: 4 },
  petName: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  petBreed: { fontSize: 13, color: colors.textMuted },
  moodBadge: { backgroundColor: `${colors.primary}10`, borderRadius: 10, padding: 10, marginTop: 6, borderWidth: 1, borderColor: `${colors.primary}25` },
  moodLabel: { fontSize: 10, fontWeight: '700', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodEmoji: { fontSize: 26 },
  moodMain: { fontSize: 14, fontWeight: '800', color: colors.textMain },
  moodSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  alertBadge: { backgroundColor: colors.dangerBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.dangerBorder, marginTop: 4 },
  alertText: { fontSize: 11, color: colors.dangerText, fontWeight: '700' },

  addPetCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed', marginBottom: 12, gap: 12 },
  addPetEmoji: { fontSize: 28 },
  addPetText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  addPetArrow: { fontSize: 18, color: colors.primary },

  // Visit card
  visitCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 24, gap: 4 },
  visitCardActive: { borderColor: colors.successBorder, backgroundColor: colors.successBg },
  visitLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  visitDates: { fontSize: 20, fontWeight: '800', color: colors.textMain },
  visitStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotActive: { backgroundColor: colors.successText },
  statusDotPending: { backgroundColor: colors.primary },
  visitStatus: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  noVisitCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 24, alignItems: 'center', gap: 8 },
  noVisitText: { fontSize: 14, color: colors.textMuted },
  noVisitLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },

  actionsTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { flex: 1, minWidth: '44%', backgroundColor: colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  actionCardDanger: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
  actionEmoji: { fontSize: 28 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMain },
  actionLabelDanger: { color: colors.dangerText },
});
