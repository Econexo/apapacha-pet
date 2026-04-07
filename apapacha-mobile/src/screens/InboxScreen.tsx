import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';

const MOCK_INBOX = [
  {
    id: 'c1',
    name: 'Roberto Valdés',
    msg: '¡Claro! Le administro el medicamento a la hora exacta.',
    time: '10:45 AM',
    unread: 2,
    avatar: 'https://images.unsplash.com/photo-1537368910025-7028ba0a464a?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'c2',
    name: 'María S.',
    msg: 'Te envié fotos de Michi comiendo.',
    time: 'Ayer',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop'
  }
];

interface InboxScreenProps {
  onNavigateToChat: (id: string) => void;
}

export function InboxScreen({ onNavigateToChat }: InboxScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {MOCK_INBOX.map((chat) => (
          <TouchableOpacity 
            key={chat.id} 
            style={styles.chatRow} 
            activeOpacity={0.7}
            onPress={() => onNavigateToChat(chat.id)}
          >
            <Image source={{ uri: chat.avatar }} style={styles.avatar} />
            
            <View style={styles.messageContent}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, chat.unread > 0 && styles.nameUnread]}>{chat.name}</Text>
                <Text style={[styles.time, chat.unread > 0 && styles.timeUnread]}>{chat.time}</Text>
              </View>
              <View style={styles.snippetRow}>
                <Text style={[styles.snippet, chat.unread > 0 && styles.snippetUnread]} numberOfLines={1}>
                  {chat.msg}
                </Text>
                {chat.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{chat.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMain,
    letterSpacing: -0.5,
  },
  scrollContainer: {
    paddingTop: 8,
  },
  chatRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  messageContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: colors.textMain,
    fontWeight: '500',
  },
  nameUnread: {
    fontWeight: '800',
  },
  time: {
    fontSize: 13,
    color: colors.textMuted,
  },
  timeUnread: {
    color: colors.primary,
    fontWeight: '700',
  },
  snippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snippet: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
    paddingRight: 12,
  },
  snippetUnread: {
    color: colors.textMain,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
  }
});
