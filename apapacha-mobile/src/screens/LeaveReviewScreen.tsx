import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { createReview } from '../services/reviews.service';
import type { RootStackParamList } from '../types/navigation';

type Route = RouteProp<RootStackParamList, 'LeaveReview'>;

const TIP_OPTIONS = [0, 1000, 2000, 5000, 10000];
const fmt = (n: number) => n === 0 ? 'Sin propina' : `$${n.toLocaleString('es-CL')}`;

export function LeaveReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { bookingId, hostId, hostName } = route.params;

  const [rating, setRating]     = useState(0);
  const [comment, setComment]   = useState('');
  const [tip, setTip]           = useState(0);
  const [saving, setSaving]     = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Calificación requerida', 'Por favor selecciona al menos 1 estrella.');
      return;
    }
    setSaving(true);
    try {
      await createReview({
        booking_id: bookingId,
        host_id: hostId,
        rating,
        comment: comment.trim() || undefined,
        tip_amount: tip,
      });
      Alert.alert(
        '¡Gracias por tu reseña! 🐾',
        tip > 0 ? `Tu propina de ${fmt(tip)} fue enviada al cuidador.` : 'Tu opinión ayuda a otros dueños de gatos.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar la reseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dejar Reseña</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.hostName}>¿Cómo fue la experiencia con{'\n'}<Text style={{ color: colors.primary }}>{hostName}</Text>?</Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
              <Text style={[styles.star, { color: s <= rating ? '#F59E0B' : colors.border }]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating === 0 ? 'Toca para calificar' :
           rating === 1 ? 'Malo' : rating === 2 ? 'Regular' :
           rating === 3 ? 'Bueno' : rating === 4 ? 'Muy bueno' : '¡Excelente!'}
        </Text>

        {/* Comment */}
        <Text style={styles.label}>Comentario (opcional)</Text>
        <TextInput
          style={styles.textarea}
          value={comment}
          onChangeText={setComment}
          placeholder="¿Cómo se portó el cuidador? ¿Tu gato estuvo bien?"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Tip */}
        <Text style={styles.label}>Propina para el cuidador 💝</Text>
        <Text style={styles.tipHint}>La propina va directamente al cuidador y suma puntos a su nivel.</Text>
        <View style={styles.tipRow}>
          {TIP_OPTIONS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tipOption, tip === t && styles.tipOptionActive]}
              onPress={() => setTip(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tipOptionText, tip === t && styles.tipOptionTextActive]}>
                {fmt(t)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tip > 0 && (
          <View style={styles.tipSummary}>
            <Text style={styles.tipSummaryText}>
              💝 Estás enviando <Text style={{ fontWeight: '800', color: colors.primary }}>{fmt(tip)}</Text> de propina al cuidador
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (saving || rating === 0) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={saving || rating === 0}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.submitBtnText}>Enviar Reseña {tip > 0 ? `+ ${fmt(tip)} propina` : ''}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  content: { padding: 24, paddingBottom: 80 },
  hostName: { fontSize: 20, fontWeight: '700', color: colors.textMain, textAlign: 'center', marginBottom: 28, lineHeight: 28 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  star: { fontSize: 48 },
  ratingLabel: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.textMuted, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 8 },
  textarea: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 14, color: colors.textMain, height: 100, marginBottom: 28 },
  tipHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12, marginTop: -4 },
  tipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tipOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  tipOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tipOptionText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tipOptionTextActive: { color: colors.primaryDark, fontWeight: '800' },
  tipSummary: { backgroundColor: `${colors.primary}10`, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.primaryLight },
  tipSummaryText: { fontSize: 14, color: colors.textMain, textAlign: 'center', lineHeight: 20 },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 15 },
});
