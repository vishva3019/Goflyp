import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { ApiClient } from '../../services/api';

interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  isMe: boolean;
}

const QUICK_CHIPS = [
  'I am at the campus gate.',
  'Where are you waiting?',
  'Helmet is ready!',
  'Arriving in 2 minutes.',
  'Thanks for the ride!',
];

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string; recipientName?: string }>();
  const bookingId = params.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>(params.recipientName || '');

  const flatListRef = useRef<FlatList>(null);
  const pollTimerRef = useRef<any>(null);

  const recipientDisplayName = partnerName || 'Journey Partner';

  const fetchMessages = async (silent = false) => {
    if (!bookingId) return;
    if (!silent) setErrorMsg(null);
    try {
      const res = await ApiClient.getChatMessages(bookingId);
      setMessages(res.messages || []);
    } catch (e: any) {
      if (!silent) {
        setErrorMsg(e.message || 'Unable to load chat messages.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Poll every 3.5 seconds while chat screen is open
    pollTimerRef.current = setInterval(() => {
      fetchMessages(true);
    }, 3500);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [bookingId]);

  useEffect(() => {
    if (!partnerName && bookingId) {
      ApiClient.getBooking(bookingId)
        .then((res: any) => {
          const b = res.booking || res;
          if (b) {
            const name = user?.id === b.captain_id ? b.rider_name : b.captain_name;
            if (name) setPartnerName(name);
          }
        })
        .catch(() => {});
    }
  }, [bookingId, partnerName, user?.id]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || !bookingId || isSending) return;

    setIsSending(true);
    setInputText('');

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      bookingId,
      senderId: user?.id || 'me',
      senderName: user?.fullName || 'You',
      message: text,
      isRead: false,
      createdAt: new Date().toISOString(),
      isMe: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await ApiClient.sendChatMessage(bookingId, text);
      if (res.chatMessage) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.chatMessage : m))
        );
      }
    } catch (err: any) {
      // Revert optimistic on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setErrorMsg(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'ios' ? insets.top : 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      ]}
    >
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.recipientName, { color: colors.textPrimary }]} numberOfLines={1}>
              {recipientDisplayName}
            </Text>
            <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(32, 232, 90, 0.15)' }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.accent} />
              <Text style={[styles.verifiedText, { color: colors.accent }]}>Student</Text>
            </View>
          </View>
          <Text style={[styles.statusSubtext, { color: colors.accent }]}>
            Alliance Campus Trip Chat
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.callButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          onPress={() => fetchMessages(false)}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Error Notice */}
      {errorMsg && (
        <View style={[styles.errorBar, { backgroundColor: 'rgba(255, 91, 101, 0.12)' }]}>
          <Ionicons name="alert-circle-outline" size={14} color="#FF5B65" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Messages List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Connecting to journey chat...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Secure Student Journey Chat
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Coordinate your pickup location, gate meeting point, or helmet details directly with {recipientDisplayName}.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageRow,
                item.isMe ? styles.myMessageRow : styles.theirMessageRow,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  item.isMe
                    ? [styles.myBubble, { backgroundColor: colors.accent }]
                    : [styles.theirBubble, { backgroundColor: colors.card, borderColor: colors.border }],
                  Shadows.soft,
                ]}
              >
                {!item.isMe && (
                  <Text style={[styles.senderLabel, { color: colors.accent }]}>
                    {item.senderName}
                  </Text>
                )}
                <Text
                  style={[
                    styles.messageText,
                    { color: item.isMe ? '#05070E' : colors.textPrimary },
                  ]}
                >
                  {item.message}
                </Text>
                <View style={styles.messageMeta}>
                  <Text
                    style={[
                      styles.timestamp,
                      { color: item.isMe ? 'rgba(5, 7, 14, 0.6)' : colors.textMuted },
                    ]}
                  >
                    {formatMessageTime(item.createdAt)}
                  </Text>
                  {item.isMe && (
                    <Ionicons
                      name={item.isRead ? 'checkmark-done' : 'checkmark'}
                      size={13}
                      color={item.isRead ? '#05070E' : 'rgba(5, 7, 14, 0.5)'}
                      style={{ marginLeft: 3 }}
                    />
                  )}
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Quick Communication Chips */}
      <View style={styles.quickChipsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_CHIPS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.quickChipsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chipBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => handleSendMessage(item)}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder={`Message ${recipientDisplayName}...`}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={300}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() ? colors.accent : colors.surfaceElevated,
            },
          ]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#05070E" />
          ) : (
            <Ionicons
              name="send"
              size={17}
              color={inputText.trim() ? '#05070E' : colors.textMuted}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipientName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
  },
  statusSubtext: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: 2,
  },
  callButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: '#FF5B65',
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: Typography.fontSize.xs,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 3,
  },
  messageText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 9,
  },
  quickChipsWrapper: {
    paddingVertical: 6,
  },
  quickChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.medium,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 90,
    fontSize: Typography.fontSize.sm,
    paddingVertical: 6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
