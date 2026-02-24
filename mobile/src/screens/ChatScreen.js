import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getChatHistory, saveChatMessage, clearChatHistory } from '../services/supabase';
import { streamChat } from '../services/api';
import { formatTime } from '../utils/helpers';

const SUGGESTED = [
  "What should I eat before my workout?",
  "How much protein do I actually need?",
  "Give me a high-protein breakfast under 400 calories",
  "Is intermittent fasting right for my goals?",
  "What's a healthy snack under 200 calories?",
  "How can I hit my protein goal today?",
];

export default function ChatScreen() {
  const { theme, profile, session } = useApp();
  const s = styles(theme);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const streamingIdRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    if (!session?.user) return;
    try {
      const history = await getChatHistory(session.user.id, 50);
      setMessages(history.filter(m => m.role !== 'system'));
    } catch (err) {
      console.error('Load chat history:', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text = input.trim()) {
    if (!text || streaming) return;
    setInput('');

    const userMsg = { id: Date.now().toString(), role: 'user', content: text, created_at: new Date().toISOString() };
    const assistantId = Date.now().toString() + '_ai';
    streamingIdRef.current = assistantId;

    const assistantMsg = { id: assistantId, role: 'assistant', content: '', created_at: new Date().toISOString(), streaming: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    // Save user message to Supabase
    try { await saveChatMessage(session.user.id, 'user', text); } catch {}

    // Build message history for AI (last 10 exchanges)
    const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: text });

    let fullResponse = '';
    try {
      fullResponse = await streamChat(history, profile, (chunk) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: m.content + chunk }
            : m
        ));
        flatListRef.current?.scrollToEnd({ animated: false });
      });

      // Mark streaming done
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ));

      // Save assistant message to Supabase
      try { await saveChatMessage(session.user.id, 'assistant', fullResponse); } catch {}
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Sorry, I had trouble responding. Please try again.', streaming: false }
          : m
      ));
    } finally {
      setStreaming(false);
    }
  }

  function handleClearChat() {
    Alert.alert('Clear Chat', 'Delete all chat history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          try {
            await clearChatHistory(session.user.id);
            setMessages([]);
          } catch (err) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  }

  function renderMessage({ item }) {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAI]}>
        {!isUser && <Text style={s.avatar}>🥦</Text>}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
          <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>
            {item.content}
            {item.streaming && <Text style={{ color: theme.primary }}>▌</Text>}
          </Text>
          <Text style={[s.bubbleTime, isUser && { color: 'rgba(255,255,255,0.6)' }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Top bar */}
      <View style={s.topBar}>
        <View>
          <Text style={s.topBarTitle}>🥦 NutriCoach AI</Text>
          <Text style={s.topBarSub}>Powered by {profile?.ai_provider || 'OpenAI'}</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClearChat} style={s.clearBtn}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🥦</Text>
            <Text style={s.emptyTitle}>Your AI Nutritionist</Text>
            <Text style={s.emptySub}>
              Ask me anything about nutrition, recipes, meal planning, or your health goals.
              {profile && `\n\nI know your profile — ${profile.tdee} kcal target, ${profile.diet_style} diet.`}
            </Text>
            <Text style={[s.emptySub, { marginTop: 20, fontWeight: '600', color: theme.text }]}>Try asking:</Text>
            {SUGGESTED.slice(0, 3).map((q, i) => (
              <TouchableOpacity
                key={i}
                style={s.suggestionBtn}
                onPress={() => sendMessage(q)}
              >
                <Text style={s.suggestionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
      />

      {/* Suggested questions (when there are messages) */}
      {messages.length > 0 && messages.length < 4 && (
        <View style={s.suggestionsRow}>
          <FlatList
            data={SUGGESTED}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.suggestionChip}
                onPress={() => sendMessage(item)}
                disabled={streaming}
              >
                <Text style={s.suggestionChipText} numberOfLines={1}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your nutritionist..."
          placeholderTextColor={theme.textMuted}
          multiline
          maxLength={1000}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || streaming) && s.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || streaming}
        >
          {streaming ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ fontSize: 20 }}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  topBarTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  topBarSub: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  clearBtn: { padding: 8 },
  clearBtnText: { color: theme.danger, fontSize: 14, fontWeight: '600' },
  messageList: { padding: 16, flexGrow: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  avatar: { fontSize: 24, marginRight: 8, marginBottom: 4 },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12 },
  bubbleUser: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: theme.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border },
  bubbleText: { color: theme.text, fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTime: { color: theme.textMuted, fontSize: 11, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  emptyTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  emptySub: { color: theme.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  suggestionBtn: {
    backgroundColor: theme.card, borderRadius: 12, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: theme.border, width: '100%',
  },
  suggestionText: { color: theme.accent, fontSize: 14 },
  suggestionsRow: { paddingVertical: 8 },
  suggestionChip: {
    backgroundColor: theme.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.border, maxWidth: 240,
  },
  suggestionChipText: { color: theme.accent, fontSize: 13 },
  inputRow: {
    flexDirection: 'row', padding: 12, backgroundColor: theme.card,
    borderTopWidth: 1, borderTopColor: theme.border, gap: 8, alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: theme.text,
    fontSize: 15, maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
