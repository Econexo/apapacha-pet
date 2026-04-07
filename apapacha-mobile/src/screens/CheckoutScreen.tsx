import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';

interface CheckoutScreenProps {
  onBack: () => void;
  onConfirmAndPay: () => void;
  type: 'SPACE' | 'VISITER';
}

export function CheckoutScreen({ onBack, onConfirmAndPay, type }: CheckoutScreenProps) {
  
  // Parámetros ficticios del carrito
  const rateTotal = 30000; // Tarifa hospedaje
  const appFee = 4500; // 15% Comisión Plataforma
  const trustSafeFee = 2500; // Fondo de Seguro de Emergencia Vet
  const grandTotal = rateTotal + appFee + trustSafeFee;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmar y Pagar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Resumen del Sitter/Servicio */}
        <View style={styles.serviceCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2000&auto=format&fit=crop' }} 
            style={styles.serviceImage} 
          />
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceSubtitle}>Depto Malla Completa Centro</Text>
            <Text style={styles.serviceTitle}>Hospedado por María</Text>
            <Text style={styles.serviceRating}>⭐ 4.96 (124 reseñas)</Text>
          </View>
        </View>

        {/* Resumen de Fechas */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Tu Reserva</Text>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Fechas</Text>
            <Text style={styles.rowValue}>10 Abril - 12 Abril</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Huésped</Text>
            <Text style={styles.rowValue}>1 Gato (Michi)</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Estructura de Finanzas (Unit Economics) */}
        <View style={styles.sectionBlock}>
           <Text style={styles.sectionTitle}>Detalle de Precios</Text>
           
           <View style={styles.priceRow}>
             <Text style={styles.priceConcept}>$15.000 x 2 noches</Text>
             <Text style={styles.priceNumber}>${rateTotal.toLocaleString('es-CL')}</Text>
           </View>
           
           <View style={styles.priceRow}>
             <Text style={styles.priceConcept}>Tarifa de Servicio (ApapachaPet)</Text>
             <Text style={styles.priceNumber}>${appFee.toLocaleString('es-CL')}</Text>
           </View>

           <View style={styles.priceRow}>
             <Text style={[styles.priceConcept, {color: colors.success, fontWeight: '600'}]}>Malla de Seguro Zero Trust</Text>
             <Text style={styles.priceNumber}>${trustSafeFee.toLocaleString('es-CL')}</Text>
           </View>

           <View style={styles.totalRow}>
             <Text style={styles.totalLabel}>Total (CLP)</Text>
             <Text style={styles.totalValue}>${grandTotal.toLocaleString('es-CL')}</Text>
           </View>
        </View>

        <View style={styles.divider} />

        {/* Políticas Legales */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Política de Cancelación Estricta</Text>
          <Text style={styles.policyText}>
            Reembolso completo si cancelas antes del 3 de Abril. Ningún monto pagado por el Seguro Zero Trust es reembolsable.
          </Text>
        </View>

      </ScrollView>

      {/* Barra fija de pago */}
      <View style={styles.footer}>
         <TouchableOpacity style={styles.submitBtn} onPress={onConfirmAndPay}>
           <Text style={styles.submitBtnText}>Pagar con Tarjeta (Falso) e Ir al Check-in</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    fontSize: 24,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 24,
  },
  serviceImage: {
    width: 100,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
  },
  serviceRating: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMain,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
  },
  rowValue: {
    fontSize: 15,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceConcept: {
    fontSize: 15,
    color: colors.textMuted,
  },
  priceNumber: {
    fontSize: 15,
    color: colors.textMain,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  footer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  submitBtnText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 16,
  }
});
