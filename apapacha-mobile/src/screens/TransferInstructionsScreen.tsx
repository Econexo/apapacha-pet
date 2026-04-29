import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { submitPaymentReceipt } from '../services/bookings.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'TransferInstructions'>;

const BANK_DETAILS = {
  banco: 'Banco Estado',
  tipo: 'Cuenta Vista',
  numero: '123456789',   // ← actualizar
  rut: '12.345.678-9',  // ← actualizar
  nombre: 'Apapacha SpA',
  email: 'apapachapet.app@gmail.com',
};

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
      <Text style={styles.copyIcon}>{copied ? '✓' : '⎘'}</Text>
    </TouchableOpacity>
  );
}

export function TransferInstructionsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId, amount } = route.params;

  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const shortId = bookingId.slice(0, 8).toUpperCase();

  const pickReceipt = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso requerido'); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.8,
    });
    if (!result.canceled) setReceiptUri(result.assets[0].uri);
  };

  const handleUpload = async () => {
    if (!receiptUri) return;
    setUploading(true);
    try {
      await submitPaymentReceipt(bookingId, receiptUri);
      setDone(true);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el comprobante');
    } finally {
      setUploading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>¡Comprobante enviado!</Text>
          <Text style={styles.successText}>
            Revisaremos tu transferencia en las próximas horas. Te notificaremos cuando tu reserva esté activa.
          </Text>
          <Text style={styles.successRef}>Referencia: #{shortId}</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Ir a mis Reservas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Instrucciones de Pago</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto a transferir</Text>
          <Text style={styles.amountValue}>{fmt(amount)}</Text>
          <Text style={styles.amountRef}>Reserva #{shortId} — incluir en el comentario</Text>
        </View>

        <Text style={styles.sectionTitle}>Datos de transferencia</Text>
        <View style={styles.bankCard}>
          <CopyRow label="Banco"   value={BANK_DETAILS.banco}  />
          <CopyRow label="Tipo"    value={BANK_DETAILS.tipo}   />
          <CopyRow label="Número"  value={BANK_DETAILS.numero} />
          <CopyRow label="RUT"     value={BANK_DETAILS.rut}    />
          <CopyRow label="Nombre"  value={BANK_DETAILS.nombre} />
          <CopyRow label="Email"   value={BANK_DETAILS.email}  />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📌 Incluye el número de reserva <Text style={{ fontWeight: '800' }}>#{shortId}</Text> en el comentario de la transferencia para que podamos identificarla.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Sube tu comprobante</Text>
        <Text style={styles.sectionSub}>Una vez transferido, sube la captura o PDF del comprobante para agilizar la confirmación.</Text>

        <TouchableOpacity style={styles.uploadBtn} onPress={pickReceipt} activeOpacity={0.8}>
          {receiptUri ? (
            <Image source={{ uri: receiptUri }} style={styles.receiptPreview} resizeMode="cover" />
          ) : (
            <>
              <Text style={styles.uploadIcon}>📎</Text>
              <Text style={styles.uploadText}>Seleccionar comprobante</Text>
              <Text style={styles.uploadHint}>JPG, PNG o PDF</Text>
            </>
          )}
        </TouchableOpacity>

        {receiptUri && (
          <TouchableOpacity
            style={[styles.sendBtn, uploading && { opacity: 0.6 }]}
            onPress={handleUpload}
            activeOpacity={0.8}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator color={colors.surface} />
              : <Text style={styles.sendBtnText}>Enviar comprobante</Text>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.laterBtn}
          onPress={() => navigation.navigate('MainTabs')}
          activeOpacity={0.8}
        >
          <Text style={styles.laterBtnText}>Transferiré después</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textMain },
  content: { padding: 20, paddingBottom: 60 },

  amountCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  amountLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  amountValue: { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 8 },
  amountRef: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },

  bankCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 },
  copyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  copyRowText: { flex: 1 },
  copyLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  copyValue: { fontSize: 15, fontWeight: '700', color: colors.textMain },
  copyIcon: { fontSize: 16, color: colors.primary, fontWeight: '700', paddingLeft: 12 },

  infoBox: { backgroundColor: `${colors.primary}10`, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: `${colors.primary}25`, marginBottom: 24 },
  infoText: { fontSize: 13, color: colors.textMain, lineHeight: 20 },

  uploadBtn: { backgroundColor: colors.surface, borderRadius: 16, height: 140, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  receiptPreview: { width: '100%', height: '100%' },
  uploadIcon: { fontSize: 28, marginBottom: 6 },
  uploadText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  uploadHint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },

  sendBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  sendBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },

  laterBtn: { paddingVertical: 12, alignItems: 'center' },
  laterBtnText: { color: colors.textMuted, fontSize: 14 },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  successIcon: { fontSize: 72 },
  successTitle: { fontSize: 26, fontWeight: '800', color: colors.textMain, textAlign: 'center' },
  successText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  successRef: { fontSize: 13, fontWeight: '700', color: colors.primary },
  doneBtn: { backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 8 },
  doneBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
