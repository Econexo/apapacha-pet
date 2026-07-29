import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import type { RootStackParamList } from '../types/navigation';
import type { Message } from '../types/database';
import { pickImage, pickVideo, type MediaSource } from '../lib/mediaPicker';
import { MediaSourceSheet } from '../components/MediaSourceSheet';
import { useToast } from '../components/Toast';
import {
  getMessages, sendMessage, subscribeToMessages, uploadChatImage, uploadChatVideo,
  CHAT_VIDEO_MAX_SECONDS,
} from '../services/messages.service';
import { markChatNotificationsRead } from '../services/notifications.service';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../supabase';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ChatDetail'>;

const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

export function ChatDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const { id: bookingId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('Chat de reserva');
  const [sheetKind, setSheetKind] = useState<'image' | 'video' | null>(null);
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    supabase.from('bookings').select('service_type, service_id').eq('id', bookingId).single()
      .then(async ({ data: booking }) => {
        if (!booking) return;
        if (booking.service_type === 'space') {
          const { data } = await supabase.from('spaces').select('title').eq('id', booking.service_id).single();
          if (data) setHeaderTitle(data.title);
        } else {
          const { data } = await supabase.from('visiters').select('name').eq('id', booking.service_id).single();
          if (data) setHeaderTitle(data.name);
        }
      });
  }, [bookingId]);

  useEffect(() => {
    let cancelled = false;
    getMessages(bookingId).then(initial => {
      if (cancelled) return;
      setMessages(initial);
      setLoading(false);
      channelRef.current = subscribeToMessages(bookingId, newMsg => {
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      });
    }).catch(e => { console.error(e); setLoading(false); });
    return () => { cancelled = true; channelRef.current?.unsubscribe(); };
  }, [bookingId]);

  // Al abrir el chat, sus notificaciones dejan de estar pendientes.
  // `messages.length` va en las deps a propósito: si el chat se queda abierto y
  // llegan mensajes nuevos por Realtime, también hay que marcar esas notificaciones
  // como leídas (si dejáramos solo [bookingId] quedarían pendientes para siempre).
  // Se ejecuta una vez por mensaje nuevo, pero marcar como leído es idempotente y
  // muy barato, así que no compensa añadir más lógica para agrupar las llamadas.
  useEffect(() => {
    markChatNotificationsRead(bookingId).catch(() => {});
  }, [bookingId, messages.length]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try { await sendMessage(bookingId, text); }
    catch (e) { console.error('Error sending message:', e); }
  };

  const handlePickMedia = async (source: MediaSource) => {
    const kind = sheetKind;
    setSheetKind(null);
    if (uploading || !kind) return;

    if (kind === 'image') {
      const uri = await pickImage(source, { quality: 0.7 });
      if (!uri) return;
      setUploading(true);
      try {
        const url = await uploadChatImage(bookingId, uri);
        await sendMessage(bookingId, '', url);
      } catch (e) {
        console.error('Error subiendo foto al chat:', e);
        toast.error('No se pudo enviar la foto', 'Inténtalo de nuevo.');
      } finally {
        setUploading(false);
      }
      return;
    }

    const video = await pickVideo(source, { maxDurationSec: CHAT_VIDEO_MAX_SECONDS });
    if (!video) return;
    if (video.duration && video.duration / 1000 > CHAT_VIDEO_MAX_SECONDS) {
      toast.error('Video muy largo', `El máximo son ${CHAT_VIDEO_MAX_SECONDS} segundos.`);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadChatVideo(bookingId, video.uri);
      await sendMessage(bookingId, '', undefined, url);
    } catch (e: any) {
      console.error('Error subiendo video al chat:', e);
      if (e?.message === 'VIDEO_DEMASIADO_GRANDE') {
        toast.error('Video muy pesado', 'El máximo son 25 MB. Graba uno más corto.');
      } else {
        toast.error('No se pudo enviar el video', 'Inténtalo de nuevo.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>{headerTitle}</Text>
        <View style={styles.placeholderSpace} />
      </View>

      <View style={styles.trustBanner}>
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.warningText} />
        <Text style={styles.trustBannerText}>Por tu seguridad, nunca realices pagos fuera de ApapachaPet.</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.chatArea} showsVerticalScrollIndicator={false}>
          {!loading && messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={30} color={colors.primary} /></View>
              <Text style={styles.emptyTitle}>Aún no hay mensajes</Text>
              <Text style={styles.emptyText}>Escribe el primero para coordinar los detalles del cuidado.</Text>
            </View>
          )}
          {messages.map(msg => {
            const isMine = msg.sender_id === user?.id;
            return (
              <View key={msg.id} style={isMine ? styles.rowSent : styles.rowReceived}>
                {msg.video_url ? (
                  <ChatVideo uri={msg.video_url} />
                ) : msg.image_url ? (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => Platform.OS === 'web' ? window.open(msg.image_url!, '_blank') : undefined}>
                    <Image source={{ uri: msg.image_url }} style={styles.chatImage} resizeMode="cover" />
                  </TouchableOpacity>
                ) : (
                  <View style={isMine ? styles.bubbleSent : styles.bubbleReceived}>
                    <Text style={isMine ? styles.textSent : styles.textReceived}>{msg.content}</Text>
                  </View>
                )}
                <Text style={styles.timeText}>{fmtTime(msg.created_at)}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.attachButton} onPress={() => setSheetKind('image')} disabled={uploading} activeOpacity={0.7}>
            {uploading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="camera-outline" size={22} color={colors.primary} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachButton} onPress={() => setSheetKind('video')} disabled={uploading} activeOpacity={0.7}>
            <Ionicons name="videocam-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.inputBox}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <MediaSourceSheet
          visible={sheetKind !== null}
          kind={sheetKind ?? 'image'}
          onClose={() => setSheetKind(null)}
          onPick={handlePickMedia}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Burbuja de video. expo-video funciona en web y nativo; si el player falla,
// queda el enlace para abrirlo aparte.
function ChatVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  return <VideoView style={styles.chatVideo} player={player} allowsFullscreen nativeControls />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  headerName: { flex: 1, textAlign: 'center', fontFamily: fonts.display, fontSize: 18, color: colors.textMain },
  placeholderSpace: { width: 38 },
  trustBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.warningBg, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.warningBorder },
  trustBannerText: { fontSize: 12, color: colors.warningText, fontWeight: '700' },
  chatArea: { padding: 16, paddingBottom: 40, flexGrow: 1 },

  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.textMain },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  rowReceived: { alignSelf: 'flex-start', maxWidth: '82%', marginBottom: 12 },
  rowSent: { alignSelf: 'flex-end', maxWidth: '82%', marginBottom: 12 },
  bubbleReceived: { backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: colors.border },
  bubbleSent: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, borderBottomRightRadius: 5 },
  textReceived: { fontSize: 15, color: colors.textMain, lineHeight: 20 },
  textSent: { fontSize: 15, color: '#fff', lineHeight: 20 },
  timeText: { fontSize: 10.5, color: colors.textMuted, marginTop: 3, marginHorizontal: 6 },

  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  attachButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  chatImage: { width: 200, height: 200, borderRadius: 16, backgroundColor: colors.surfaceAlt },
  chatVideo: { width: 240, height: 240, borderRadius: 16, backgroundColor: colors.surfaceAlt },
  inputBox: { flex: 1, backgroundColor: colors.background, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, fontSize: 15, color: colors.textMain, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  sendButtonDisabled: { backgroundColor: colors.border },
});
