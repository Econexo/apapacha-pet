import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { Message } from '../types/database';
import { getMessages, sendMessage, subscribeToMessages } from '../services/messages.service';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ChatDetail'>;

export function ChatDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const { id: bookingId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    getMessages(bookingId).then(setMessages).catch(console.error);
    channelRef.current = subscribeToMessages(bookingId, newMsg => {
      setMessages(prev => [...prev, newMsg]);
    });
    return () => { channelRef.current?.unsubscribe(); };
  }, [bookingId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      await sendMessage(bookingId, text);
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>Chat de Reserva</Text>
        <View style={styles.placeholderSpace} />
      </View>

      <View style={styles.trustBanner}>
        <Text style={styles.trustBannerText}>⚠️ Por tu seguridad, nunca realices pagos fuera de la plataforma ApapachaPet.</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatArea}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(msg => {
            const isMine = msg.sender_id === user?.id;
            return (
              <View key={msg.id} style={isMine ? styles.bubbleSent : styles.bubbleReceived}>
                <Text style={isMine ? styles.textSent : styles.textReceived}>{msg.content}</Text>
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
          >
            <Text style={styles.sendIcon}>➤</Text>
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
  backBtnText: { fontSize: 24, color: colors.primary },
  headerName: { fontSize: 18, fontWeight: '700', color: colors.textMain },
  placeholderSpace: { width: 40 },
  trustBanner: { backgroundColor: colors.warningBg, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.warningBorder },
  trustBannerText: { fontSize: 12, color: colors.warningText, textAlign: 'center', fontWeight: '600' },
  chatArea: { padding: 16, paddingBottom: 40 },
  bubbleReceived: { backgroundColor: colors.surface, padding: 14, borderRadius: 18, borderBottomLeftRadius: 4, alignSelf: 'flex-start', maxWidth: '80%', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  textReceived: { fontSize: 15, color: colors.textMain, lineHeight: 20 },
  bubbleSent: { backgroundColor: colors.primary, padding: 14, borderRadius: 18, borderBottomRightRadius: 4, alignSelf: 'flex-end', maxWidth: '80%', marginBottom: 12 },
  textSent: { fontSize: 15, color: colors.surface, lineHeight: 20 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  inputBox: { flex: 1, backgroundColor: colors.background, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, fontSize: 15, color: colors.textMain, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  sendButtonDisabled: { backgroundColor: colors.border },
  sendIcon: { color: colors.surface, fontSize: 16, fontWeight: '800' },
});
