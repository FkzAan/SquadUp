import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { getCurrentUserId } from '../services/authService';
import { fetchMessages, sendMessage, subscribeToMessages } from '../services/chatService';
import type { ChatMessage } from '../types';

type Props = {
  lobbyId: string;
  title: string;
  onBack: () => void;
};

function chatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? `${hh}:${mm}` : `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
}

export default function LobbyChatScreen({ lobbyId, title, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    getCurrentUserId().then(setMyId);
    fetchMessages(lobbyId).then((list) => {
      setMessages(list);
      setLoading(false);
    });

    // mesej baru masuk secara real-time (elak duplikat)
    return subscribeToMessages(lobbyId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
  }, [lobbyId]);

  async function onSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    const err = await sendMessage(lobbyId, text);
    setSending(false);
    if (err) Alert.alert('Ralat', err);
    else setText('');
  }

  function renderItem({ item }: { item: ChatMessage }) {
    const mine = item.user_id === myId;
    return (
      <View style={[s.row, mine && s.rowMine]}>
        {!mine && <Avatar uri={item.avatar_url} name={item.name} size={30} />}
        <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
          {!mine && <Text style={s.sender}>{item.name}</Text>}
          <Text style={[s.content, mine && s.contentMine]}>{item.content}</Text>
          <Text style={[s.time, mine && s.timeMine]}>{chatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.topRow}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <Text style={s.subtitle}>Chat squad</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={s.empty}>Belum ada mesej. Mulakan perbualan dengan squad kamu!</Text>
          }
        />
      )}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Tulis mesej..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
          onPress={onSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { padding: 6, borderRadius: 10, backgroundColor: '#fff', elevation: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#6b7280', fontSize: 12 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  rowMine: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, flexShrink: 1 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
  bubbleMine: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  sender: { fontSize: 12, fontWeight: '700', color: '#2563eb', marginBottom: 2 },
  content: { fontSize: 15, color: '#111827' },
  contentMine: { color: '#fff' },
  time: { fontSize: 10, color: '#9ca3af', marginTop: 4, alignSelf: 'flex-end' },
  timeMine: { color: '#dbeafe' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  sendBtn: { backgroundColor: '#2563eb', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
