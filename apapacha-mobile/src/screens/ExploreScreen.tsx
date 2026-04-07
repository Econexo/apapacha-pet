import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { SpaceCard } from '../components/SpaceCard';
import { VisiterCard } from '../components/VisiterCard';

const MOCK_SPACES = [
  {
    id: '1',
    title: 'Depto Malla Completa Centro, 100% Catified',
    location: 'Providencia, Santiago',
    pricePerNight: 15000,
    rating: 4.96,
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2000&auto=format&fit=crop'
  },
  {
    id: '2',
    title: 'Casa con Patio Cerrado & Árboles Trepadores',
    location: 'Las Condes, Santiago',
    pricePerNight: 22000,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000&auto=format&fit=crop'
  }
];

const MOCK_VISITERS = [
  {
    id: 'v1',
    name: 'Roberto Valdés',
    professionTitle: 'Auxiliar Veterinario Especialista',
    pricePerVisit: 8500,
    rating: 4.98,
    totalVisits: 342,
    imageUrl: 'https://images.unsplash.com/photo-1537368910025-7028ba0a464a?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'v2',
    name: 'Camila Ríos',
    professionTitle: 'Top Rated Cat Walker',
    pricePerVisit: 6000,
    rating: 4.85,
    totalVisits: 120,
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop'
  }
];

const FILTERS = ['Patio Cerrado', 'Sitter Médico', 'Sin Otros Gatos', 'Rascadores Premium'];

interface ExploreScreenProps {
  onNavigateToDetail: (id: string, type: 'SPACE'|'VISITER') => void;
  onNavigateToSearch: () => void;
}

export function ExploreScreen({ onNavigateToDetail, onNavigateToSearch }: ExploreScreenProps) {
  const [activeTab, setActiveTab] = useState<'SPACES' | 'VISITERS'>('SPACES');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Toggle de Selección de Servicio */}
        <View style={styles.serviceToggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeTab === 'SPACES' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('SPACES')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'SPACES' && styles.toggleTextActive]}>🏠 Alojamiento</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeTab === 'VISITERS' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('VISITERS')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'VISITERS' && styles.toggleTextActive]}>🚗 Visitas en Casa</Text>
          </TouchableOpacity>
        </View>

        {/* Barra de búsqueda dinámica (Ahora Activa) */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={onNavigateToSearch}>
          <View style={styles.searchIconPlaceholder}>
            <Text>🔍</Text>
          </View>
          <View style={styles.searchTexts}>
            <Text style={styles.searchTitle}>
              {activeTab === 'SPACES' ? '¿Dónde hospedará tu compañero?' : '¿Dónde necesitas tu visita?'}
            </Text>
            <Text style={styles.searchSubtitle}>Cualquier lugar • Fechas • 1 Huésped</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Chips de filtro (Solo para espacios en este mock) */}
      {activeTab === 'SPACES' && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTERS.map((f, i) => (
              <TouchableOpacity key={i} style={styles.filterChip}>
                <Text style={styles.filterText}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Lista Principal Restante */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'SPACES' ? (
          MOCK_SPACES.map(space => (
            <SpaceCard key={space.id} {...space} onPress={(id) => onNavigateToDetail(id, 'SPACE')} />
          ))
        ) : (
          MOCK_VISITERS.map(visiter => (
            <VisiterCard key={visiter.id} {...visiter} onPress={(id) => onNavigateToDetail(id, 'VISITER')} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5, backgroundColor: colors.surface },
  serviceToggleContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 30, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 26 },
  toggleBtnActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.textMain, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: colors.border },
  searchIconPlaceholder: { marginLeft: 8, marginRight: 16 },
  searchTexts: { flex: 1 },
  searchTitle: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  searchSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  filterContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textMain },
  listContainer: { padding: 20, paddingTop: 16, paddingBottom: 100 }
});
