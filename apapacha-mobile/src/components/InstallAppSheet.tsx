import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import { Button } from './ui/Button';
import { useToast } from './Toast';
import { isStandalonePWA } from '../services/push.service';
import {
  detectarSistema, esSafariIOS, puedeInstalarDirecto,
  suscribirseAInstalacion, lanzarInstalacion, type Sistema,
} from '../lib/installPrompt';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Paso { icono: IconName; texto: string }

interface Guia {
  titulo: string;
  intro: string;
  pasos: Paso[];
  nota?: string;
}

// Las instrucciones cambian por sistema porque el mecanismo cambia de verdad:
// iOS solo permite instalar desde el menú Compartir de Safari, y únicamente
// Chromium ofrece instalación con un clic.
function guiaPara(sistema: Sistema, safariIOS: boolean): Guia {
  switch (sistema) {
    case 'ios':
      return safariIOS
        ? {
            titulo: 'Instalar en tu iPhone',
            intro: 'Quedará como una app más, con su ícono en la pantalla de inicio.',
            pasos: [
              { icono: 'share-outline', texto: 'Toca el botón Compartir, abajo al centro de Safari.' },
              { icono: 'add-circle-outline', texto: 'Desliza y elige "Agregar a pantalla de inicio".' },
              { icono: 'checkmark-circle-outline', texto: 'Confirma con "Agregar" y ábrela desde su ícono.' },
            ],
            nota: 'Las notificaciones de mensajes y reservas solo funcionan abriéndola desde el ícono, no desde Safari.',
          }
        : {
            titulo: 'Ábrela en Safari',
            intro: 'En iPhone, solo Safari puede instalar la app en la pantalla de inicio.',
            pasos: [
              { icono: 'compass-outline', texto: 'Copia esta dirección y ábrela en Safari.' },
              { icono: 'share-outline', texto: 'Ahí toca Compartir y luego "Agregar a pantalla de inicio".' },
            ],
          };
    case 'android':
      return {
        titulo: 'Instalar en tu Android',
        intro: 'Quedará como una app más, con su ícono en el escritorio.',
        pasos: [
          { icono: 'ellipsis-vertical', texto: 'Abre el menú del navegador, arriba a la derecha.' },
          { icono: 'phone-portrait-outline', texto: 'Elige "Instalar aplicación" o "Agregar a pantalla principal".' },
          { icono: 'checkmark-circle-outline', texto: 'Confirma y ábrela desde su ícono.' },
        ],
      };
    case 'escritorio-chromium':
      return {
        titulo: 'Instalar en tu computador',
        intro: 'Se abrirá en su propia ventana, sin barra de direcciones.',
        pasos: [
          { icono: 'download-outline', texto: 'Busca el ícono de instalar al final de la barra de direcciones.' },
          { icono: 'checkmark-circle-outline', texto: 'También está en el menú del navegador, en "Instalar ApapachaPet".' },
        ],
      };
    default:
      return {
        titulo: 'Instalar la app',
        intro: 'Tu navegador actual no permite instalarla.',
        pasos: [
          { icono: 'globe-outline', texto: 'Ábrela en Chrome o Edge para instalarla en el computador.' },
          { icono: 'phone-portrait-outline', texto: 'En el teléfono, usa Safari (iPhone) o Chrome (Android).' },
        ],
      };
  }
}

export function InstallAppSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const [directo, setDirecto] = useState(puedeInstalarDirecto());

  useEffect(() => suscribirseAInstalacion(() => setDirecto(puedeInstalarDirecto())), []);

  const instalada = isStandalonePWA();
  const sistema = detectarSistema();
  const guia = guiaPara(sistema, esSafariIOS());

  const instalar = async () => {
    const aceptada = await lanzarInstalacion();
    if (aceptada) { toast.success('¡Listo!', 'Ya puedes abrirla desde su ícono.'); onClose(); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          {instalada ? (
            <View style={styles.instalada}>
              <View style={styles.iconWrap}>
                <Ionicons name="checkmark-circle" size={30} color={colors.accent} />
              </View>
              <Text style={styles.titulo}>Ya la tienes instalada</Text>
              <Text style={styles.intro}>Estás usando ApapachaPet como aplicación. No hay nada más que hacer.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.titulo}>{guia.titulo}</Text>
              <Text style={styles.intro}>{guia.intro}</Text>

              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {directo && (
                  <Button
                    label="Instalar ahora"
                    icon="download"
                    onPress={instalar}
                    style={{ alignSelf: 'stretch', marginBottom: 18 }}
                  />
                )}

                {directo && <Text style={styles.oBien}>o hazlo a mano:</Text>}

                <View style={styles.pasos}>
                  {guia.pasos.map((paso, i) => (
                    <View key={i} style={styles.paso}>
                      <View style={styles.pasoIcono}>
                        <Ionicons name={paso.icono} size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.pasoTexto}>{paso.texto}</Text>
                    </View>
                  ))}
                </View>

                {!!guia.nota && (
                  <View style={styles.nota}>
                    <Ionicons name="notifications-outline" size={15} color={colors.warningText} />
                    <Text style={styles.notaTexto}>{guia.nota}</Text>
                  </View>
                )}
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={styles.cerrar} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cerrarTexto}>{instalada ? 'Entendido' : 'Cerrar'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },

  titulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textMain },
  intro: { fontSize: 13.5, color: colors.textMuted, marginTop: 4, marginBottom: 18, lineHeight: 19 },

  oBien: { fontSize: 12.5, color: colors.textMuted, marginBottom: 12 },

  pasos: { gap: 14 },
  paso: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pasoIcono: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  pasoTexto: { flex: 1, fontSize: 14, color: colors.textMain, lineHeight: 20, paddingTop: 7 },

  nota: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 18, padding: 12, borderRadius: radii.md, backgroundColor: colors.warningBg },
  notaTexto: { flex: 1, fontSize: 12.5, color: colors.warningText, lineHeight: 18 },

  instalada: { alignItems: 'center', paddingVertical: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },

  cerrar: { marginTop: 18, paddingVertical: 13, alignItems: 'center' },
  cerrarTexto: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
});
