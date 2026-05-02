import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import type { Pet, HostApplication } from '../types/database';
import { getMyPets } from '../services/pets.service';
import { getMyApplication } from '../services/host.service';
import { supabase } from '../../supabase';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const APPLICATION_STATUS_LABEL: Record<string, { icon: IoniconName; text: string; color: string }> = {
  pending:  { icon: 'time-outline',            text: 'Postulación en revisión', color: colors.warning },
  approved: { icon: 'checkmark-circle-outline', text: 'Cuidador aprobado',       color: colors.accent  },
  rejected: { icon: 'close-circle-outline',     text: 'Postulación rechazada',   color: colors.danger  },
};

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, signOut } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [application, setApplication] = useState<HostApplication | null>(null);

  useEffect(() => {
    getMyPets().then(setPets).catch(console.error);
    getMyApplication().then(setApplication).catch(console.error);
  }, []);

  const isHost = profile?.role === 'host';
  const statusInfo = application ? APPLICATION_STATUS_LABEL[application.status] : null;
  const [uploadingContract, setUploadingContract] = useState(false);

  const handleUploadContract = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setUploadingContract(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sin sesión');
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const ext = file.mimeType?.includes('pdf') ? 'pdf' : 'jpg';
      const path = `${user.id}/contrato-firmado.${ext}`;
      const { error } = await supabase.storage.from('contracts').upload(path, blob, { upsert: true, contentType: file.mimeType ?? 'application/pdf' });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(path);
      await supabase.from('profiles').update({ signed_contract_url: urlData.publicUrl }).eq('id', user.id);
      Alert.alert('✅ Contrato enviado', 'Tu contrato firmado fue cargado exitosamente. El equipo de ApapachaPet lo revisará pronto.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo subir el contrato');
    } finally {
      setUploadingContract(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.editBtnText}>Editar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.ownerCard}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : '??'}
              </Text>
            </View>
          )}
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerName}>{profile?.full_name || 'Mi Perfil'}</Text>
            <View style={styles.kycRow}>
              <Ionicons
                name={profile?.kyc_status === 'verified' ? 'shield-checkmark-outline' : profile?.kyc_status === 'under_review' ? 'hourglass-outline' : 'time-outline'}
                size={14}
                color={profile?.kyc_status === 'verified' ? colors.accent : colors.warning}
              />
              <Text style={styles.ownerStatus}>
                {profile?.kyc_status === 'verified' ? 'Identidad Verificada' : profile?.kyc_status === 'under_review' ? 'Verificación en revisión' : 'Verificación Pendiente'}
              </Text>
            </View>
            {isHost && (
              <View style={styles.hostBadgeRow}>
                <Ionicons name="star-outline" size={13} color={colors.primary} />
                <Text style={styles.hostBadge}>Cuidador Activo</Text>
              </View>
            )}
          </View>
        </View>

        {profile?.kyc_status === 'under_review' && (
          <View style={styles.reviewBanner}>
            <Text style={styles.reviewBannerText}>
              🔍 Tu identidad está siendo revisada por el equipo. Puedes usar la app con normalidad, pero algunas funciones se habilitarán al ser aprobado (24-48 hrs).
            </Text>
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Mi Familia Felina</Text>
          <TouchableOpacity style={styles.addPetBtn} onPress={() => navigation.navigate('AddPetModal')}>
            <Text style={styles.addPetBtnText}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        {pets.map(pet => (
          <View key={pet.id} style={styles.catCard}>
            <View style={styles.catHeader}>
              {pet.image_url ? (
                <Image source={{ uri: pet.image_url }} style={styles.catImage} />
              ) : (
                <View style={[styles.catImage, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 32 }}>🐱</Text>
                </View>
              )}
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{pet.name}</Text>
                <Text style={styles.catDetails}>{pet.breed || 'Sin raza'} • {pet.age_years} años</Text>
                <Text style={styles.catDetails}>{pet.sterilized ? 'Esterilizado' : 'No esterilizado'} • {pet.weight_kg} kg</Text>
              </View>
              <TouchableOpacity style={styles.editPetBtn} onPress={() => navigation.navigate('AddPetModal', { petId: pet.id })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {pet.medical_alerts.length > 0 && (
              <View style={styles.alertBlock}>
                <View style={styles.alertTitleRow}>
                  <Ionicons name="warning-outline" size={14} color={colors.dangerText} />
                  <Text style={styles.alertTitle}>Alertas Médicas</Text>
                </View>
                {pet.medical_alerts.map((alert, i) => (
                  <Text key={i} style={styles.alertText}>• {alert}</Text>
                ))}
              </View>
            )}
          </View>
        ))}

        {pets.length === 0 && (
          <View style={styles.emptyPets}>
            <Text style={styles.emptyPetsText}>Aún no tienes mascotas registradas.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Modo Negocio</Text>

        {isHost ? (
          <TouchableOpacity
            style={styles.hostDashboardBtn}
            onPress={() => navigation.navigate('HostDashboard')}
          >
            <Ionicons name="home-outline" size={18} color={colors.surface} />
            <Text style={styles.hostDashboardBtnText}>Ir a mi Panel de Cuidador</Text>
          </TouchableOpacity>
        ) : statusInfo ? (
          <View style={[styles.applicationStatus, { borderColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon} size={28} color={statusInfo.color} />
            <View style={styles.applicationStatusText}>
              <Text style={[styles.applicationStatusTitle, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
              <Text style={styles.applicationStatusSub}>
                {application?.status === 'pending'
                  ? 'Revisaremos tu postulación en 1-2 días hábiles.'
                  : application?.status === 'rejected'
                    ? 'Puedes volver a postular después de 30 días.'
                    : 'Tu cuenta ya tiene acceso al panel de cuidador.'}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.onboardingBtn} onPress={() => navigation.navigate('HostOnboarding')}>
            <Ionicons name="star-outline" size={18} color={colors.surface} />
            <Text style={styles.onboardingBtnText}>Postular para ser Cuidador / Visiter</Text>
          </TouchableOpacity>
        )}

        {(isHost || application?.status === 'approved') && (
          <View style={styles.contractSection}>
            <Text style={styles.sectionTitle}>Contrato de Cuidador</Text>
            {profile?.signed_contract_url ? (
              <View style={styles.contractSigned}>
                <Ionicons name="document-text-outline" size={28} color={colors.successText} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.contractSignedTitle}>Contrato firmado cargado</Text>
                  <Text style={styles.contractSignedSub}>El equipo de ApapachaPet está revisando tu contrato.</Text>
                </View>
              </View>
            ) : (
              <View style={styles.contractPending}>
                <Text style={styles.contractPendingText}>
                  Revisa el contrato enviado a tu email, fírmalo e imprímelo. Luego cárgalo aquí o envíalo a{' '}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>apapachapet.app@gmail.com</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.contractUploadBtn, uploadingContract && { opacity: 0.6 }]}
                  onPress={handleUploadContract}
                  disabled={uploadingContract}
                  activeOpacity={0.8}
                >
                  {uploadingContract ? (
                    <ActivityIndicator color={colors.surface} size="small" />
                  ) : (
                    <>
                      <Ionicons name="attach-outline" size={16} color={colors.surface} />
                      <Text style={styles.contractUploadBtnText}>Subir Contrato Firmado</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {profile?.is_admin && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('Admin')}>
            <Ionicons name="settings-outline" size={18} color={colors.surface} />
            <Text style={styles.adminBtnText}>Panel de Administración</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Cuenta y Legal</Text>
        <View style={styles.settingsMenu}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Métodos de Pago</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TrustAndSafety')}>
            <Text style={styles.menuItemText}>Políticas de Seguridad y Seguros</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={signOut}>
            <Text style={[styles.menuItemText, { color: colors.danger }]}>Cerrar Sesión</Text>
            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.surface },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textMain, letterSpacing: -0.5 },
  editBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  editBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  ownerCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  avatarImage: { width: 64, height: 64, borderRadius: 32, marginRight: 16 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: colors.surface, fontSize: 24, fontWeight: '700' },
  ownerInfo: { flex: 1 },
  ownerName: { fontSize: 20, fontWeight: '700', color: colors.textMain },
  kycRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  ownerStatus: { fontSize: 14, color: colors.accent, fontWeight: '600' },
  hostBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  hostBadge: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain },
  addPetBtn: { backgroundColor: `${colors.primary}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addPetBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  catCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  catHeader: { flexDirection: 'row', marginBottom: 16 },
  catImage: { width: 80, height: 80, borderRadius: 12, marginRight: 16 },
  catInfo: { flex: 1, justifyContent: 'center' },
  catName: { fontSize: 20, fontWeight: '800', color: colors.textMain, marginBottom: 4 },
  catDetails: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  alertBlock: { backgroundColor: colors.dangerBg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.dangerBorder },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  alertTitle: { fontSize: 14, fontWeight: '800', color: colors.dangerText },
  alertText: { fontSize: 13, color: colors.dangerTextDark, marginBottom: 4 },
  reviewBanner: { backgroundColor: '#FFF8E7', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F59E0B40', marginBottom: 20 },
  reviewBannerText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  editPetBtn: { padding: 4 },
  emptyPets: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginBottom: 24 },
  emptyPetsText: { color: colors.textMuted, fontSize: 14 },
  onboardingBtn: { backgroundColor: colors.warning, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  onboardingBtnText: { color: colors.surface, fontWeight: '800', fontSize: 15 },
  hostDashboardBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  hostDashboardBtnText: { color: colors.surface, fontWeight: '800', fontSize: 15 },
  applicationStatus: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 2, marginTop: 16, marginBottom: 8, gap: 12 },
  applicationStatusText: { flex: 1 },
  applicationStatusTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  applicationStatusSub: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  settingsMenu: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginTop: 16 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemText: { fontSize: 15, fontWeight: '500', color: colors.textMain },
  menuItemArrow: { color: colors.textMuted, fontSize: 16 },
  adminBtn: { backgroundColor: colors.primaryDark, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  adminBtnText: { color: colors.surface, fontWeight: '800', fontSize: 15 },
  contractSection: { marginBottom: 24 },
  contractSigned: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.success}10`, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.successBorder, gap: 12 },
  contractSignedTitle: { fontSize: 14, fontWeight: '700', color: colors.successText },
  contractSignedSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  contractPending: { backgroundColor: colors.infoBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.infoBorder },
  contractPendingText: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 12 },
  contractUploadBtn: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  contractUploadBtnText: { color: colors.surface, fontWeight: '700', fontSize: 14 },
});
