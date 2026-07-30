import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import { useToast } from './Toast';
import {
  isPushSupported, isStandalonePWA, isIOS, getPushPermission, subscribeToPush, ensurePushSubscription,
} from '../services/push.service';
import { decidePushBannerState, PushBannerState } from './pushBannerState';

export function PushPermissionBanner() {
  const toast = useToast();
  const [estado, setEstado] = useState<PushBannerState>('oculto');
  const [cargando, setCargando] = useState(false);

  // Usamos useFocusEffect en lugar de useEffect porque el tab navigator no
  // desmonta las pantallas: con useEffect y deps [], el estado se quedaría
  // congelado desde el primer montaje. Esto recalcula cada vez que se
  // navega al tab Perfil, lo que permite detectar cambios de permisos
  // y reconciliar la suscripción si fue borrada de la BD.
  useFocusEffect(
    useCallback(() => {
      setEstado(decidePushBannerState({
        supported: isPushSupported(),
        ios: isIOS(),
        standalone: isStandalonePWA(),
        permission: getPushPermission(),
      }));
      // Reconcilia permiso concedido con suscripción en BD (silencioso, nunca rechaza).
      ensurePushSubscription().catch(() => {});
    }, [])
  );

  if (estado === 'oculto') return null;

  if (estado === 'instalar') {
    return (
      <View style={styles.banner}>
        <View style={styles.iconWrap}><Ionicons name="phone-portrait-outline" size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Activa las notificaciones</Text>
          <Text style={styles.body}>
            En iPhone necesitas agregar ApapachaPet a la pantalla de inicio: toca Compartir y luego "Agregar a inicio".
          </Text>
        </View>
      </View>
    );
  }

  const activar = async () => {
    setCargando(true);
    const { ok, reason } = await subscribeToPush();
    setCargando(false);
    if (ok) {
      setEstado('oculto');
      toast.success('Notificaciones activadas', 'Te avisaremos de mensajes y reservas.');
      return;
    }
    if (reason === 'denied') {
      setEstado('oculto');
      toast.info('Notificaciones bloqueadas', 'Puedes reactivarlas desde los ajustes del navegador.');
      return;
    }
    if (reason === 'no_session') {
      toast.error('Tu sesión expiró', 'Vuelve a iniciar sesión para activar las notificaciones.');
      return;
    }
    toast.error('No se pudo activar', 'Inténtalo de nuevo en unos segundos.');
  };

  return (
    <TouchableOpacity style={styles.banner} onPress={activar} disabled={cargando} activeOpacity={0.85}>
      <View style={styles.iconWrap}><Ionicons name="notifications-outline" size={18} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Activa las notificaciones</Text>
        <Text style={styles.body}>Recibe avisos cuando te escriban o cambie el estado de una reserva.</Text>
      </View>
      <Text style={styles.cta}>{cargando ? '...' : 'Activar'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.brandTint, borderRadius: radii.md, padding: 14, marginBottom: 16 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 15, color: colors.textMain },
  body: { fontSize: 12.5, color: colors.textMuted, lineHeight: 17, marginTop: 2 },
  cta: { fontSize: 13, fontWeight: '800', color: colors.primary },
});
