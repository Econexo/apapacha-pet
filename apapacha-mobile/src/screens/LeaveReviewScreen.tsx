import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, shadows } from '../theme/design';
import { useToast } from '../components/Toast';
import { createReview, getMyReviewForBooking } from '../services/reviews.service';

const TIP_OPTIONS = [0, 1000, 2000, 5000, 10000];
const fmt = (n: number) => n === 0 ? 'Sin propina' : `$${n.toLocaleString('es-CL')}`;

const RATING_LABELS = ['', 'Malo 😞', 'Regular 😐', 'Bueno 😊', 'Muy bueno 😄', '¡Excelente! 🤩'];

const QUICK_TAGS: Record<number, string[]> = {
  5: ['Muy cariñoso 🐱', 'Puntual ⏰', 'Gran comunicación 💬', 'Limpio y ordenado ✨', 'Volvería a contratar 🔄'],
  4: ['Muy atento 👍', 'Buena comunicación 💬', 'Mi gato lo amó 😸', 'Puntual ⏰'],
  3: ['Podría mejorar', 'Comunicación aceptable', 'Cuidado básico'],
  2: ['Poco atento', 'Mala comunicación', 'No lo recomendaría'],
  1: ['No cumplió expectativas', 'Mala experiencia'],
};

// Reseña inversa: el cuidador califica al cliente
const CLIENT_TAGS: Record<number, string[]> = {
  5: ['Puntual ⏰', 'Buen trato 🤝', 'Instrucciones claras 📋', 'Gato tranquilo 😺', 'Volvería a atender 🔄'],
  4: ['Puntual ⏰', 'Buena comunicación 💬', 'Todo en orden ✨'],
  3: ['Comunicación aceptable', 'Instrucciones básicas'],
  2: ['Poca comunicación', 'Instrucciones confusas'],
  1: ['Mala experiencia', 'No recomendado'],
};

interface Props {
  bookingId: string;
  hostId: string;
  hostName: string;
  variant?: 'host' | 'client';
  onClose?: () => void;
}

export function LeaveReviewScreen({ bookingId, hostId, hostName: rawHostName, variant = 'host', onClose }: Props) {
  const isClient = variant === 'client';
  const hostName = rawHostName || (isClient ? 'Cliente' : 'Cuidador');
  const TAGS = isClient ? CLIENT_TAGS : QUICK_TAGS;
  const navigation = useNavigation();
  const toast = useToast();
  const close = () => onClose ? onClose() : navigation.goBack();

  const [rating, setRating]           = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [comment, setComment]         = useState('');
  const [tip, setTip]                 = useState(0);
  const [saving, setSaving]           = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [checkingReview, setCheckingReview]   = useState(true);
  const [starAnims]                   = useState(() => [1,2,3,4,5].map(() => new Animated.Value(1)));

  useEffect(() => {
    getMyReviewForBooking(bookingId).then(existing => {
      if (existing) setAlreadyReviewed(true);
    }).catch(() => {}).finally(() => setCheckingReview(false));
  }, [bookingId]);

  const handleStarPress = (s: number) => {
    setRating(s);
    setSelectedTags(new Set());
    // Animate tapped star
    Animated.sequence([
      Animated.timing(starAnims[s - 1], { toValue: 1.35, duration: 100, useNativeDriver: true }),
      Animated.spring(starAnims[s - 1], { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.warning('Calificación requerida', 'Por favor selecciona al menos 1 estrella.');
      return;
    }
    setSaving(true);
    try {
      const tagText = selectedTags.size > 0 ? `[${[...selectedTags].join(', ')}]` : '';
      const fullComment = [tagText, comment.trim()].filter(Boolean).join('\n');
      await createReview({
        booking_id: bookingId,
        host_id: hostId,
        rating,
        comment: fullComment || undefined,
        tip_amount: tip,
      });
      setSubmitted(true);
    } catch (e: any) {
      toast.error('Error', e.message ?? 'No se pudo guardar la reseña');
    } finally {
      setSaving(false);
    }
  };

  if (checkingReview) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (submitted || alreadyReviewed) return (
    <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 }]}>
      <View style={styles.successIcon}>
        <Text style={{ fontSize: 52 }}>{submitted ? '🐾' : '✅'}</Text>
      </View>
      <Text style={styles.successTitle}>{submitted ? '¡Gracias por calificar!' : '¡Ya dejaste tu reseña!'}</Text>
      <Text style={styles.successSub}>
        {submitted
          ? tip > 0
            ? `Tu propina de ${fmt(tip)} fue enviada a ${hostName}. Tu opinión ayuda a toda la comunidad 💜`
            : isClient
              ? 'Tu calificación ayuda a otros cuidadores a conocer a sus futuros clientes.'
              : 'Tu opinión ayuda a otros dueños a encontrar el mejor cuidado para sus gatos.'
          : 'Solo puedes dejar una reseña por servicio.'}
      </Text>
      {submitted && tip > 0 && (
        <View style={styles.tipConfirm}>
          <Text style={styles.tipConfirmText}>💝 {fmt(tip)} enviados a {hostName}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.closeBtn} onPress={close} activeOpacity={0.8}>
        <Text style={styles.closeBtnText}>Listo</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // ── MAIN REVIEW SCREEN ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeX} onPress={close} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isClient ? 'Calificar cliente' : 'Calificar servicio'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Host */}
        <View style={styles.hostCard}>
          <View style={styles.hostAvatar}>
            <Text style={{ fontSize: 28 }}>{hostName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hostLabel}>{isClient ? 'Tu cliente' : 'Tu cuidador'}</Text>
            <Text style={styles.hostName}>{hostName}</Text>
          </View>
        </View>

        {/* Stars */}
        <Text style={styles.question}>¿Cómo fue la experiencia?</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <TouchableOpacity key={s} onPress={() => handleStarPress(s)} activeOpacity={0.7}>
              <Animated.Text
                style={[
                  styles.star,
                  { color: s <= rating ? '#F59E0B' : colors.border },
                  { transform: [{ scale: starAnims[s - 1] }] },
                ]}
              >
                ★
              </Animated.Text>
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
        )}

        {/* Quick tags */}
        {rating > 0 && (TAGS[rating] ?? []).length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.tagsTitle}>¿Qué destacarías?</Text>
            <View style={styles.tagsRow}>
              {(TAGS[rating] ?? []).map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, selectedTags.has(tag) && styles.tagActive]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tagText, selectedTags.has(tag) && styles.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Comment */}
        {rating > 0 && (
          <>
            <Text style={styles.sectionLabel}>Comentario (opcional)</Text>
            <TextInput
              style={styles.textarea}
              value={comment}
              onChangeText={t => setComment(t.slice(0, 500))}
              placeholder="¿Algo más que quieras compartir sobre el servicio?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
          </>
        )}

        {/* Tip — solo cuando el dueño califica al cuidador */}
        {!isClient && rating > 0 && (
          <>
            <Text style={styles.sectionLabel}>Propina para {hostName} 💝</Text>
            <Text style={styles.tipHint}>Va directamente al cuidador y suma puntos a su nivel.</Text>
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
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (saving || rating === 0) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving || rating === 0}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.submitBtnText}>
                {rating === 0 ? 'Selecciona una calificación' : (!isClient && tip > 0) ? `Enviar reseña + ${fmt(tip)}` : 'Enviar reseña'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  closeX: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain },

  content: { padding: 24, paddingBottom: 20 },

  // Host card
  hostCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.background, borderRadius: radii.lg, padding: 16,
    marginBottom: 28, ...shadows.sm,
  },
  hostAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  hostLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  hostName: { fontSize: 18, fontWeight: '800', color: colors.textMain, marginTop: 2 },

  // Stars
  question: { fontSize: 20, fontWeight: '800', color: colors.textMain, textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 10 },
  star: { fontSize: 52 },
  ratingLabel: { textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.primary, marginBottom: 24 },

  // Quick tags
  tagsSection: { marginBottom: 24 },
  tagsTitle: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.full,
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
  },
  tagActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tagText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tagTextActive: { color: colors.primaryDark, fontWeight: '700' },

  // Comment
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 8 },
  textarea: {
    backgroundColor: colors.background, borderRadius: radii.md,
    padding: 14, fontSize: 14, color: colors.textMain, height: 90, marginBottom: 24,
  },

  // Tip
  tipHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12, marginTop: -4 },
  tipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tipOption: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.full,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background,
  },
  tipOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tipOptionText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tipOptionTextActive: { color: colors.primaryDark, fontWeight: '800' },

  // Footer
  footer: {
    backgroundColor: colors.surface, padding: 20,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radii.lg, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: colors.border },
  submitBtnText: { color: colors.surface, fontWeight: '800', fontSize: 15 },

  // Success
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontWeight: '900', color: colors.textMain, textAlign: 'center' },
  successSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  tipConfirm: {
    backgroundColor: colors.primaryLight, borderRadius: radii.lg,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  tipConfirmText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, textAlign: 'center' },
  closeBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 48, paddingVertical: 16,
    borderRadius: radii.lg, marginTop: 8,
  },
  closeBtnText: { color: colors.surface, fontWeight: '800', fontSize: 16 },
});
