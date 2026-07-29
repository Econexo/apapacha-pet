import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import type { MediaSource } from '../lib/mediaPicker';

interface Props {
  visible: boolean;
  kind: 'image' | 'video';
  onClose: () => void;
  onPick: (source: MediaSource) => void;
}

// Hoja de acción para elegir entre cámara y galería. Antes cada pantalla iba
// directo a la galería, así que no se podía capturar en el momento.
export function MediaSourceSheet({ visible, kind, onClose, onPick }: Props) {
  const opciones: { source: MediaSource; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] =
    kind === 'image'
      ? [
          { source: 'camera',  label: 'Tomar foto',           icon: 'camera-outline' },
          { source: 'library', label: 'Elegir de la galería', icon: 'images-outline' },
        ]
      : [
          { source: 'camera',  label: 'Grabar video',         icon: 'videocam-outline' },
          { source: 'library', label: 'Elegir de la galería', icon: 'film-outline' },
        ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{kind === 'image' ? 'Agregar foto' : 'Agregar video'}</Text>
          {opciones.map((o) => (
            <TouchableOpacity
              key={o.source}
              style={styles.option}
              onPress={() => { onClose(); onPick(o.source); }}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}><Ionicons name={o.icon} size={20} color={colors.primary} /></View>
              <Text style={styles.optionText}>{o.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  title: { fontFamily: fonts.display, fontSize: 17, color: colors.textMain, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textMain },
  cancel: { marginTop: 14, paddingVertical: 13, borderRadius: radii.md, backgroundColor: colors.background, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
});
