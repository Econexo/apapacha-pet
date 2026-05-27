import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { radii, shadows } from '../theme/design';
import { SpaceCard } from '../components/SpaceCard';
import { VisiterCard } from '../components/VisiterCard';
import { SpaceCardSkeleton, VisiterCardSkeleton } from '../components/Skeleton';
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

  // Pick up filter params when returning from SearchFilterScreen
  useFocusEffect(
    useCallback(() => {
      const params = route.params as any;
      if (!params) return;
      if (params.filterDestination !== undefined) {
        setDestination(params.filterDestination);
      }
      if (params.filterFeatures?.length) {
        setActiveFilters(new Set(params.filterFeatures));
      }
      // clear params to avoid re-applying on next focus
      navigation.setParams({ filterDestination: undefined, filterFeatures: undefined } as any);
    }, [route.params])
  );

  useEffect(() => {
    loadData();
  }, [activeTab, activeFilters]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'SPACES') {
        const data = await getSpaces(
          activeFilters.size > 0 ? { features: Array.from(activeFilters) } : undefined
        );
        setAllSpaces(data);
      } else {
        const data = await getVisiters();
        setVisiters(data);
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
    ? allSpaces.filter(s =>
        s.location.toLowerCase().includes(destination.toLowerCase()) ||
        s.title.toLowerCase().includes(destination.toLowerCase())
      )
    : allSpaces;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.serviceToggleContainer}>
          <TouchableOpacity style={[styles.toggleBtn, activeTab === 'SPACES' && styles.toggleBtnActive]} onPress={() => setActiveTab('SPACES')} activeOpacity={0.8}>
            <Text style={[styles.toggleText, activeTab === 'SPACES' && styles.toggleTextActive]}>🏠 Alojamiento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, activeTab === 'VISITERS' && styles.toggleBtnActive]} onPress={() => setActiveTab('VISITERS')} activeOpacity={0.8}>
            <Text style={[styles.toggleText, activeTab === 'VISITERS' && styles.toggleTextActive]}>🚗 Visitas en Casa</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => setShowFilter(true)}>
          <View style={styles.searchIconPlaceholder}><Text>🔍</Text></View>
          <View style={styles.searchTexts}>
            <Text style={styles.searchTitle}>
              {destination ? destination : (activeTab === 'SPACES' ? '¿Dónde hospedará tu compañero?' : '¿Dónde necesitas tu visita?')}
            </Text>
            <Text style={styles.searchSubtitle}>
              {destination ? 'Toca para cambiar filtros' : 'Cualquier lugar • Fechas • 1 Huésped'}
            </Text>
          </View>
          {destination ? (
            <TouchableOpacity onPress={() => setDestination('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearDestination}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </View>

      {activeTab === 'SPACES' && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            data={FILTERS}
            keyExtractor={item => item}
            renderItem={({ item }) => {
              const isActive = activeFilters.has(item);
              return (
                <TouchableOpacity style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => toggleFilter(item)}>
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={i => String(i)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={() => activeTab === 'SPACES' ? <SpaceCardSkeleton /> : <VisiterCardSkeleton />}
        />
      ) : activeTab === 'SPACES' ? (
        <FlatList
          data={spaces}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SpaceCard
              id={item.id}
              title={item.title}
              location={item.location}
              pricePerNight={item.price_per_night}
              rating={item.rating}
              imageUrl={item.image_urls?.[0] ?? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800'}
              onPress={id => navigation.navigate('SpaceDetail', { id })}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay espacios disponibles.</Text>}
        />
      ) : (
        <FlatList
          data={visiters}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <VisiterCard
              id={item.id}
              name={item.name}
              professionTitle={item.profession_title}
              pricePerVisit={item.price_per_visit}
              rating={item.rating}
              totalVisits={item.total_visits}
              imageUrl={item.image_url ?? 'https://images.unsplash.com/photo-1537368910025-7028ba0a464a?w=800'}
              onPress={id => navigation.navigate('VisiterDetail', { id })}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay cuidadores disponibles.</Text>}
        />
      )}
      <OverlayModal visible={showFilter} onClose={() => setShowFilter(false)}>
        <SearchFilterScreen
          onClose={() => setShowFilter(false)}
          onApplyFilters={(dest, features) => {
            setDestination(dest);
            setActiveFilters(new Set(features));
          }}
        />
      </OverlayModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5, backgroundColor: colors.surface },
  serviceToggleContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radii.full, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radii.full },
  toggleBtnActive: { backgroundColor: colors.surface, ...shadows.sm },
  toggleText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.textMain, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: radii.full, ...shadows.md },
  searchIconPlaceholder: { marginLeft: 8, marginRight: 16 },
  searchTexts: { flex: 1 },
  searchTitle: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  searchSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  filterContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: radii.full, backgroundColor: colors.surface, ...shadows.sm },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textMain },
  filterTextActive: { color: colors.surface },
  listContainer: { padding: 20, paddingTop: 16, paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15 },
  clearDestination: { fontSize: 16, color: colors.textMuted, paddingLeft: 8, fontWeight: '700' },
});
