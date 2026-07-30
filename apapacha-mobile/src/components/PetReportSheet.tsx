import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import { Button } from './ui/Button';
import { useToast } from './Toast';
import { MediaSourceSheet } from './MediaSourceSheet';
import { pickImage, type MediaSource } from '../lib/mediaPicker';
import { PET_MOODS, createPetReport } from '../services/petReports.service';
import type { PetMood } from '../types/database';

interface Props {
  visible: boolean;
  bookingId: string;
  onClose: () => void;
  onDone: () => void;
}

const NOTA_MAX = 200;

// Hoja con la que el cuidador reporta cómo está el gato. Sustituye al "estado"
// que antes se inventaba en Inicio a partir del UUID de la mascota.
export function PetReportSheet({ visible, bookingId, onClose, onDone }: Props) {
  const toast = useToast();
  const [mood, setMood] = useState<PetMood | null>(null);
  const [nota, setNota] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const limpiar = () => { setMood(null); setNota(''); setFotoUri(null); };

  const cerrar = () => { limpiar(); onClose(); };

  const elegirFoto = async (source: MediaSource) => {
    const uri = await pickImage(source, { quality: 0.7 });
    if (uri) setFotoUri(uri);
  };

  const enviar = async () => {
    if (!mood || enviando) return;
    setEnviando(true);
    try {
      await createPetReport(bookingId, mood, nota, fotoUri ?? undefined);
      toast.success('Reporte enviado', 'El dueño ya puede verlo en su inicio.');
      limpiar();
      onDone();
    } catch (e: any) {
      console.error('[PetReportSheet] enviar:', e);
      toast.error('No se pudo enviar', e?.message ?? 'Inténtalo de nuevo.');
      // La hoja NO se cierra: así no se pierde lo que ya escribió.
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cerrar}>
      <Pressable style={styles.backdrop} onPress={cerrar}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>¿Cómo está el gato?</Text>
          <Text style={styles.subtitle}>El dueño lo verá en su inicio y recibirá un aviso.</Text>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <View style={styles.moodGrid}>
              {PET_MOODS.map(m => {
                const activo = mood === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.moodChip, activo && styles.moodChipActive]}
                    onPress={() => setMood(m.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={m.icon} size={20} color={activo ? '#fff' : colors.primary} />
                    <Text style={[styles.moodChipText, activo && styles.moodChipTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.nota}
              value={nota}
              onChangeText={t => t.length <= NOTA_MAX && setNota(t)}
              placeholder="Agrega una nota para el dueño (opcional)"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Text style={styles.contador}>{nota.length}/{NOTA_MAX}</Text>

            {fotoUri ? (
              <View style={styles.fotoWrap}>
                <Image source={{ uri: fotoUri }} style={styles.foto} resizeMode="cover" />
                <TouchableOpacity style={styles.quitarFoto} onPress={() => setFotoUri(null)} activeOpacity={0.8}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.adjuntar} onPress={() => setPickerVisible(true)} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={18} color={colors.primary} />
                <Text style={styles.adjuntarText}>Agregar foto (opcional)</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Button
            label="Enviar reporte"
            icon="paper-plane"
            onPress={enviar}
            disabled={!mood}
            loading={enviando}
            style={{ marginTop: 14 }}
          />
          <TouchableOpacity style={styles.cancelar} onPress={cerrar} activeOpacity={0.7}>
            <Text style={styles.cancelarText}>Cancelar</Text>
          </TouchableOpacity>

          <MediaSourceSheet
            visible={pickerVisible}
            kind="image"
            onClose={() => setPickerVisible(false)}
            onPick={elegirFoto}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,16,48,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  title: { fontFamily: fonts.display, fontSize: 19, color: colors.textMain },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: 14 },

  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  moodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  moodChipText: { fontSize: 13.5, fontWeight: '700', color: colors.textMain },
  moodChipTextActive: { color: '#fff' },

  nota: { marginTop: 14, minHeight: 76, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 12, fontSize: 14, color: colors.textMain, textAlignVertical: 'top' },
  contador: { alignSelf: 'flex-end', fontSize: 11, color: colors.textMuted, marginTop: 4 },

  adjuntar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, paddingVertical: 12, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  adjuntarText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  fotoWrap: { marginTop: 12, alignSelf: 'flex-start' },
  foto: { width: 110, height: 110, borderRadius: radii.md, backgroundColor: colors.surfaceAlt },
  quitarFoto: { position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.textMain, alignItems: 'center', justifyContent: 'center' },

  cancelar: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelarText: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
});
