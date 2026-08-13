import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import { Button } from './ui/Button';
import { useToast } from './Toast';
import {
  estadoNotificaciones, subscribeToPush, unsubscribeFromPush,
  type EstadoNotificaciones,
} from '../services/push.service';

// Mensaje concreto por causa de fallo. El genérico "inténtalo de nuevo" dejaba
// al usuario sin saber qué hacer, y a nosotros sin saber qué pasó.
const MOTIVOS: Record<string, string> = {
  unsupported: 'Este navegador no puede recibir notificaciones. En iPhone usa Safari; en Android, Chrome.',
  needs_install: 'En iPhone hay que agregar la app a la pantalla de inicio y abrirla desde su ícono.',
  denied: 'Bloqueaste las notificaciones para este sitio. Hay que permitirlas en los ajustes del navegador.',
  subscribe_failed: 'El navegador no pudo crear la suscripción. Cierra la app del todo y vuelve a intentarlo.',
  invalid_subscription: 'La suscripción que entregó el navegador vino incompleta.',
  no_session: 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo otra vez.',
  db_error: 'No se pudo guardar el dispositivo en el servidor.',
  unexpected_error: 'Ocurrió un error inesperado al registrar el dispositivo.',
};

export function NotificationsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const [estado, setEstado] = useState<EstadoNotificaciones | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const refrescar = useCallback(() => {
    estadoNotificaciones().then(setEstado).catch(() => {});
  }, []);

  useEffect(() => { if (visible) refrescar(); }, [visible, refrescar]);

  const activar = async () => {
    setTrabajando(true);
    const { ok, reason } = await subscribeToPush();
    setTrabajando(false);
    refrescar();
    if (ok) toast.success('Notificaciones activadas', 'Este dispositivo ya está registrado.');
    else toast.error('No se pudo activar', MOTIVOS[reason ?? ''] ?? 'Inténtalo de nuevo en unos segundos.');
  };

  const desactivar = async () => {
    setTrabajando(true);
    await unsubscribeFromPush();
    setTrabajando(false);
    refrescar();
    toast.info('Notificaciones desactivadas', 'Este dispositivo ya no recibirá avisos.');
  };

  const listo = !!estado?.registradoEnServidor;

  // Qué le falta exactamente a este dispositivo, en orden de dependencia.
  const pendiente = (() => {
    if (!estado) return null;
    if (estado.ios && !estado.instalada) return 'En iPhone, primero agrega la app a la pantalla de inicio y ábrela desde su ícono.';
    if (!estado.soportado) return 'Este navegador no puede recibir notificaciones.';
    if (estado.permiso === 'denied') return 'Las notificaciones están bloqueadas en los ajustes del navegador para este sitio.';
    if (!estado.registradoEnServidor) return 'Falta registrar este dispositivo: toca "Activar".';
    return null;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.titulo}>Notificaciones</Text>
          <Text style={styles.intro}>
            Activar el permiso en los ajustes del teléfono no basta: hay que registrar este dispositivo desde aquí.
          </Text>

          <View style={styles.lista}>
            <Fila ok={!!estado?.soportado} texto="El navegador las soporta" />
            {estado?.ios && <Fila ok={estado.instalada} texto="App instalada en la pantalla de inicio" />}
            <Fila
              ok={estado?.permiso === 'granted'}
              texto={
                estado?.permiso === 'granted' ? 'Permiso concedido'
                  : estado?.permiso === 'denied' ? 'Permiso bloqueado'
                  : 'Permiso sin conceder'
              }
            />
            <Fila ok={!!estado?.registradoEnServidor} texto="Dispositivo registrado en el servidor" />
          </View>

          {!!pendiente && (
            <View style={styles.aviso}>
              <Ionicons name="information-circle-outline" size={16} color={colors.warningText} />
              <Text style={styles.avisoTexto}>{pendiente}</Text>
            </View>
          )}

          {listo ? (
            <TouchableOpacity style={styles.desactivar} onPress={desactivar} disabled={trabajando} activeOpacity={0.7}>
              <Text style={styles.desactivarTexto}>Desactivar en este dispositivo</Text>
            </TouchableOpacity>
          ) : (
            <Button
              label="Activar notificaciones"
              icon="notifications"
              onPress={activar}
              loading={trabajando}
              disabled={estado?.permiso === 'denied' || (estado?.ios && !estado?.instalada)}
              style={{ alignSelf: 'stretch', marginTop: 18 }}
            />
          )}

          <TouchableOpacity style={styles.cerrar} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cerrarTexto}>Cerrar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Fila({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <View style={styles.fila}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'close-circle'}
        size={19}
        color={ok ? colors.accent : colors.textMuted}
      />
      <Text style={[styles.filaTexto, !ok && { color: colors.textMuted }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  titulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textMain },
  intro: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 18, lineHeight: 19 },

  lista: { gap: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filaTexto: { flex: 1, fontSize: 14, color: colors.textMain },

  aviso: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 18, padding: 12, borderRadius: radii.md, backgroundColor: colors.warningBg },
  avisoTexto: { flex: 1, fontSize: 12.5, color: colors.warningText, lineHeight: 18 },

  desactivar: { marginTop: 18, paddingVertical: 13, alignItems: 'center', borderRadius: radii.md, backgroundColor: colors.background },
  desactivarTexto: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
  cerrar: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cerrarTexto: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
});
