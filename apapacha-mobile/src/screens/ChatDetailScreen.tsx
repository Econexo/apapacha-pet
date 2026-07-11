import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
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
import { getMessages, sendMessage, subscribeToMessages } from '../services/messages.service';
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
  const [headerTitle, setHeaderTitle] = useState('Chat de reserva');
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
                <View style={isMine ? styles.bubbleSent : styles.bubbleReceived}>
                  <Text style={isMine ? styles.textSent : styles.textReceived}>{msg.content}</Text>
                </View>
                <Text style={styles.timeText}>{fmtTime(msg.created_at)}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputArea}>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
  inputBox: { flex: 1, backgroundColor: colors.background, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, fontSize: 15, color: colors.textMain, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  sendButtonDisabled: { backgroundColor: colors.border },
});
