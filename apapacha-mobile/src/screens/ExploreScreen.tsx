import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme/colors';
import { radii, shadows } from '../theme/design';
import { SpaceCard } from '../components/SpaceCard';
import { VisiterCard } from '../components/VisiterCard';
import { SpaceCardSkeleton, VisiterCardSkeleton } from '../components/Skeleton';
import { AppText } from '../components/ui/AppText';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { FadeInView } from '../components/ui/FadeInView';
import type { RootStackParamList } from '../types/navigation';
import type { Space, Visiter } from '../types/database';
import { getSpaces } from '../services/spaces.service';
import { getVisiters } from '../services/visiters.service';
import { OverlayModal } from '../components/OverlayModal';
import { SearchFilterScreen } from './SearchFilterScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['Mallas certificadas', 'Sin otros animales', 'Sin niños', 'Rascadores'];

export function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const [activeTab, setActiveTab] = useState<'SPACES' | 'VISITERS'>('SPACES');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [allSpaces, setAllSpaces] = useState<Space[]>([]);
  const [visiters, setVisiters] = useState<Visiter[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const params = route.params as any;
      if (!params) return;
      if (params.filterDestination !== undefined) setDestination(params.filterDestination);
      if (params.filterFeatures?.length) setActiveFilters(new Set(params.filterFeatures));
      navigation.setParams({ filterDestination: undefined, filterFeatures: undefined } as any);
    }, [route.params])
  );

  useEffect(() => { loadData(); }, [activeTab, activeFilters]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'SPACES') {
        const data = await getSpaces(activeFilters.size > 0 ? { features: Array.from(activeFilters) } : undefined);
        setAllSpaces(data);
      } else {
        setVisiters(await getVisiters());
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  const spaces = destination
    ? allSpaces.filter(s => s.location.toLowerCase().includes(destination.toLowerCase()) || s.title.toLowerCase().includes(destination.toLowerCase()))
    : allSpaces;

  const renderToggle = (t: 'SPACES' | 'VISITERS') => {
    const active = activeTab === t;
    const icon = t === 'SPACES' ? 'home' : 'walk';
    const lbl = t === 'SPACES' ? 'Alojamiento' : 'Visitas';
    const inner = (
      <View style={styles.toggleInner}>
        <Ionicons name={icon as any} size={16} color={active ? '#fff' : colors.textMuted} />
        <AppText variant="bodyStrong" color={active ? '#fff' : colors.textMuted} style={{ fontSize: 14 }}>{lbl}</AppText>
      </View>
    );
    return (
      <TouchableOpacity key={t} activeOpacity={0.85} onPress={() => setActiveTab(t)} style={{ flex: 1 }}>
        {active
          ? <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.toggleBtn}>{inner}</LinearGradient>
          : <View style={styles.toggleBtn}>{inner}</View>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground />
      <View style={styles.header}>
        <View style={styles.toggle}>
          {renderToggle('SPACES')}
          {renderToggle('VISITERS')}
        </View>
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.85} onPress={() => setShowFilter(true)}>
          <Ionicons name="search" size={18} color={colors.primary} />
          <View style={styles.searchTexts}>
            <AppText variant="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>
              {destination ? destination : (activeTab === 'SPACES' ? '¿Dónde hospedará tu gato?' : '¿Dónde necesitas la visita?')}
            </AppText>
            <AppText variant="small" color={colors.textMuted}>
              {destination ? 'Toca para cambiar filtros' : 'Cualquier lugar · Fechas · 1 gato'}
            </AppText>
          </View>
          {destination
            ? <TouchableOpacity onPress={() => setDestination('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Ionicons name="close-circle" size={20} color={colors.textMuted} /></TouchableOpacity>
            : <Ionicons name="options-outline" size={20} color={colors.textMuted} />}
        </TouchableOpacity>
      </View>

      {activeTab === 'SPACES' && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}
            data={FILTERS} keyExtractor={item => item}
            renderItem={({ item }) => {
              const isActive = activeFilters.has(item);
              return (
                <TouchableOpacity style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => toggleFilter(item)} activeOpacity={0.8}>
                  <AppText variant="small" color={isActive ? colors.primary : colors.textMuted} style={{ fontFamily: undefined, fontWeight: '700' }}>{item}</AppText>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {loading ? (
        <FlatList data={[1, 2, 3]} keyExtractor={i => String(i)} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
          renderItem={() => activeTab === 'SPACES' ? <SpaceCardSkeleton /> : <VisiterCardSkeleton />} />
      ) : activeTab === 'SPACES' ? (
        <FlatList
          data={spaces} keyExtractor={item => item.id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <FadeInView delay={Math.min(index, 8) * 45}>
              <SpaceCard id={item.id} title={item.title} location={item.location} pricePerNight={item.price_per_night} rating={item.rating}
                imageUrl={item.image_urls?.[0] ?? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800'}
                onPress={id => navigation.navigate('SpaceDetail', { id })} />
            </FadeInView>
          )}
          ListEmptyComponent={<EmptyState icon="home-outline" title="Sin espacios disponibles" />}
        />
      ) : (
        <FlatList
          data={visiters} keyExtractor={item => item.id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <FadeInView delay={Math.min(index, 8) * 45}>
              <VisiterCard id={item.id} name={item.name} professionTitle={item.profession_title} pricePerVisit={item.price_per_visit}
                rating={item.rating} totalVisits={item.total_visits}
                imageUrl={item.image_url ?? 'https://images.unsplash.com/photo-1537368910025-7028ba0a464a?w=800'}
                onPress={id => navigation.navigate('VisiterDetail', { id })} />
            </FadeInView>
          )}
          ListEmptyComponent={<EmptyState icon="paw-outline" title="Sin cuidadores disponibles" />}
        />
      )}

      <OverlayModal visible={showFilter} onClose={() => setShowFilter(false)}>
        <SearchFilterScreen
          onClose={() => setShowFilter(false)}
          onApplyFilters={(dest, features) => { setDestination(dest); setActiveFilters(new Set(features)); }}
        />
      </OverlayModal>
    </SafeAreaView>
  );
}

function EmptyState({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}><Ionicons name={icon} size={34} color={colors.primary} /></View>
      <AppText variant="h" style={{ textAlign: 'center' }}>{title}</AppText>
      <AppText variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>Prueba cambiando los filtros o vuelve más tarde.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  toggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.full, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  toggleBtn: { paddingVertical: 10, alignItems: 'center', borderRadius: radii.full },
  toggleInner: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, paddingVertical: 13, paddingHorizontal: 16, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, ...shadows.md },
  searchTexts: { flex: 1 },
  filterContainer: { paddingVertical: 12 },
  filterScroll: { paddingHorizontal: 20, gap: 9 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.brandTint, borderColor: colors.primary },
  listContainer: { padding: 20, paddingTop: 8, paddingBottom: 100 },
  emptyState: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 32 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
