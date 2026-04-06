import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { SpaceCard } from '../components/SpaceCard';

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
  },
  {
    id: '3',
    title: 'Hospedaje Veterinario Estricto',
    location: 'Ñuñoa, Santiago',
    pricePerNight: 25000,
    rating: 4.85,
    imageUrl: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop'
  }
];

const FILTERS = ['Patio Cerrado', 'Sitter Médico', 'Sin Otros Gatos', 'Rascadores Premium'];

interface ExploreScreenProps {
  onNavigateToDetail: (id: string) => void;
}

export function ExploreScreen({ onNavigateToDetail }: ExploreScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Barra de búsqueda falsa */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
          <View style={styles.searchIconPlaceholder}>
            <Text>🔍</Text>
          </View>
          <View style={styles.searchTexts}>
            <Text style={styles.searchTitle}>¿Dónde hospedará tu compañero?</Text>
            <Text style={styles.searchSubtitle}>Cualquier lugar • Fechas • 1 Huésped</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Chips de filtro */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f, i) => (
            <TouchableOpacity key={i} style={styles.filterChip}>
              <Text style={styles.filterText}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {MOCK_SPACES.map(space => (
          <SpaceCard
            key={space.id}
            {...space}
            onPress={onNavigateToDetail}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIconPlaceholder: {
    marginLeft: 8,
    marginRight: 16,
  },
  searchTexts: {
    flex: 1,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
  },
  searchSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMain,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  }
});
