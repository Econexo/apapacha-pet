import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { pickImage, type MediaSource } from '../lib/mediaPicker';
import { MediaSourceSheet } from '../components/MediaSourceSheet';
import * as Clipboard from 'expo-clipboard';
import { useGoBack } from '../hooks/useGoBack';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii, shadows } from '../theme/design';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import type { RootStackParamList } from '../types/navigation';
import { submitPaymentReceipt } from '../services/bookings.service';
import { supabase } from '../../supabase';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'TransferInstructions'>;

interface TransferDetails {
  banco: string; tipo: string; numero: string; rut: string; nombre: string; email: string;
}

const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`;

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <TouchableOpacity style={styles.copyRow} onPress={copy} activeOpacity={0.7}>
      <View style={styles.copyRowText}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text style={styles.copyValue}>{value}</Text>
      </View>
      <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={18} color={copied ? colors.success : colors.primary} />
    </TouchableOpacity>
  );
}

export function TransferInstructionsScreen() {
  const navigation = useNavigation<Nav>();
  const volver = useGoBack('Bookings');
  const route = useRoute<Route>();
  const { bookingId, amount } = route.params;

  const [transferDetails, setTransferDetails] = useState<TransferDetails | null>(null);
  const [loadingDetails, setLoadingDetails]   = useState(true);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [done, setDone]             = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const toast = useToast();

  useEffect(() => {
    supabase.from('app_config').select('value').eq('key', 'transfer_details').single()
      .then(({ data, error }) => {
        if (error || !data) console.error('[TransferInstructions] app_config fetch:', error?.message);
        else setTransferDetails(data.value as TransferDetails);
        setLoadingDetails(false);
      });
  }, []);

  const shortId = bookingId.slice(0, 8).toUpperCase();

  const handlePickReceipt = async (source: MediaSource) => {
    const uri = await pickImage(source, { quality: 0.8 });
    if (!uri) return;
    setReceiptUri(uri);
  };

  const handleUpload = async () => {
    if (!receiptUri) return;
    setUploading(true);
    try {
      await submitPaymentReceipt(bookingId, receiptUri);
      setDone(true);
    } catch (e: any) {
      toast.error('Error', e.message ?? 'No se pudo enviar el comprobante');
    } finally {
      setUploading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIconBox}><Ionicons name="checkmark-circle" size={56} color={colors.success} /></View>
          <Text style={styles.successTitle}>¡Comprobante enviado!</Text>
          <Text style={styles.successText}>
            Revisaremos tu transferencia en las próximas horas. Te notificaremos cuando tu reserva esté activa.
          </Text>
          <Text style={styles.successRef}>Referencia: #{shortId}</Text>
          <Button label="Ir a mis reservas" icon="calendar" onPress={() => navigation.navigate('MainTabs', { screen: 'Bookings' } as any)} style={{ width: '100%', marginTop: 8 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => volver()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pago por transferencia</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.acceptedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={colors.successText} />
          <Text style={styles.acceptedText}>El cuidador aceptó tu reserva — realiza el pago para activarla.</Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto a transferir</Text>
          <Text style={styles.amountValue}>{fmt(amount)}</Text>
          <Text style={styles.amountRef}>Reserva #{shortId} — inclúyelo en el comentario</Text>
        </View>

        <Text style={styles.sectionTitle}>Datos de transferencia</Text>
        {loadingDetails ? (
          <View style={styles.bankCard}><ActivityIndicator color={colors.primary} style={{ margin: 24 }} /></View>
        ) : !transferDetails ? (
          <View style={[styles.bankCard, { padding: 20 }]}>
            <Text style={{ color: colors.danger, fontSize: 14, textAlign: 'center' }}>
              No se pudieron cargar los datos de transferencia. Contáctanos a apapachapet.app@gmail.com
            </Text>
          </View>
        ) : (
          <View style={styles.bankCard}>
            <CopyRow label="Banco"   value={transferDetails.banco}  />
            <CopyRow label="Tipo"    value={transferDetails.tipo}   />
            <CopyRow label="Número"  value={transferDetails.numero} />
            <CopyRow label="RUT"     value={transferDetails.rut}    />
            <CopyRow label="Nombre"  value={transferDetails.nombre} />
            <CopyRow label="Email"   value={transferDetails.email}  />
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="pricetag-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            Incluye el número de reserva <Text style={{ fontWeight: '800' }}>#{shortId}</Text> en el comentario de la transferencia para que podamos identificarla.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Sube tu comprobante</Text>
        <Text style={styles.sectionSub}>Una vez transferido, sube la captura o PDF del comprobante para agilizar la confirmación.</Text>

        <TouchableOpacity style={styles.uploadBtn} onPress={() => setSheetVisible(true)} activeOpacity={0.8}>
          {receiptUri ? (
            <Image source={{ uri: receiptUri }} style={styles.receiptPreview} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={30} color={colors.primary} />
              <Text style={styles.uploadText}>Seleccionar comprobante</Text>
              <Text style={styles.uploadHint}>JPG, PNG o PDF</Text>
            </>
          )}
        </TouchableOpacity>

        {receiptUri && (
          <Button label="Enviar comprobante" icon="send" loading={uploading} onPress={handleUpload} style={{ width: '100%', marginBottom: 12 }} />
        )}

        <TouchableOpacity style={styles.laterBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'Bookings' } as any)} activeOpacity={0.8}>
          <Text style={styles.laterBtnText}>Transferiré después</Text>
        </TouchableOpacity>
      </ScrollView>

      <MediaSourceSheet
        visible={sheetVisible}
        kind="image"
        onClose={() => setSheetVisible(false)}
        onPick={handlePickReceipt}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.textMain },
  backBtn: { padding: 8 },
  content: { padding: 20, paddingBottom: 60 },

  acceptedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.successBg, borderRadius: radii.md, borderWidth: 1, borderColor: colors.successBorder, padding: 12, marginBottom: 16 },
  acceptedText: { flex: 1, fontSize: 12.5, color: colors.successText, fontWeight: '700', lineHeight: 17 },

  amountCard: { backgroundColor: colors.primary, borderRadius: radii.lg, padding: 24, alignItems: 'center', marginBottom: 24, ...shadows.md },
  amountLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  amountValue: { fontFamily: fonts.display, fontSize: 38, color: '#fff', marginBottom: 8, letterSpacing: -0.5 },
  amountRef: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  sectionTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.textMain, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },

  bankCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 },
  copyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  copyRowText: { flex: 1 },
  copyLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  copyValue: { fontSize: 15, fontWeight: '700', color: colors.textMain },

  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.brandTint, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: `${colors.primary}22`, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 13, color: colors.textMain, lineHeight: 20 },

  uploadBtn: { backgroundColor: colors.surface, borderRadius: radii.lg, height: 140, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', gap: 6 },
  receiptPreview: { width: '100%', height: '100%' },
  uploadText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  uploadHint: { fontSize: 12, color: colors.textMuted },

  laterBtn: { paddingVertical: 12, alignItems: 'center' },
  laterBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  successIconBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.textMain, textAlign: 'center' },
  successText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  successRef: { fontSize: 13, fontWeight: '800', color: colors.primary },
});
