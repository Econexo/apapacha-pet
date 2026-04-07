import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface ProfileScreenProps {
  onSwitchToHost: () => void;
  onAddPet: () => void;
}

export function ProfileScreen({ onSwitchToHost, onAddPet }: ProfileScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Owner Profile Card */}
        <View style={styles.ownerCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>CG</Text>
          </View>
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerName}>Carlos Gómez</Text>
            <Text style={styles.ownerStatus}>✓ Identidad Verificada</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Mi Familia Felina</Text>
          <TouchableOpacity style={styles.addPetBtn} onPress={onAddPet}>
            <Text style={styles.addPetBtnText}>+ Añadir</Text>
          </TouchableOpacity>
        </View>
        
        {/* Cat Profile Card */}
        <View style={styles.catCard}>
          <View style={styles.catHeader}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?q=80&w=300&auto=format&fit=crop' }} 
              style={styles.catImage} 
            />
            <View style={styles.catInfo}>
              <Text style={styles.catName}>Michi</Text>
              <Text style={styles.catDetails}>Gato Común Europeo • 3 Años</Text>
              <Text style={styles.catDetails}>Esterilizado • 4.5 kg</Text>
            </View>
          </View>

          <View style={styles.alertBlock}>
            <Text style={styles.alertTitle}>⚠️ Alertas Médicas (Estricto)</Text>
            <Text style={styles.alertText}>• Alergia severa a proteína de pollo.</Text>
            <Text style={styles.alertText}>• Medicación renal necesaria AM/PM.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Modo Negocio</Text>
        <TouchableOpacity style={styles.hostSwitchBtn} onPress={onSwitchToHost}>
          <Text style={styles.hostSwitchBtnText}>Cambiar a Modo Cuidador (Host)</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Cuenta y Legal</Text>
        <View style={styles.settingsMenu}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Métodos de Pago</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Documentos del Propietario</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
            <Text style={styles.menuItemText}>Cerrar Sesión</Text>
          </TouchableOpacity>
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
    paddingBottom: 10,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMain,
    letterSpacing: -0.5,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '700',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
  },
  ownerStatus: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  addPetBtn: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPetBtnText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  catCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  catImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  catInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  catName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 4,
  },
  catDetails: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  alertBlock: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 8,
  },
  alertText: {
    fontSize: 13,
    color: '#7F1D1D',
    marginBottom: 4,
  },
  hostSwitchBtn: {
    backgroundColor: colors.primaryDark,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  hostSwitchBtnText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 15,
  },
  settingsMenu: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMain,
  },
  menuItemArrow: {
    color: colors.textMuted,
    fontSize: 16,
  }
});
