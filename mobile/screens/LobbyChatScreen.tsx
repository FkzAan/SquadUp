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
import { palette, cardShadow } from '../theme';
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
    const res = await sendMessage(lobbyId, text);
    setSending(false);
    if (res.ok) setText('');
    else if (res.blocked) {
      Alert.alert('🛡️ Mesej disekat', `${res.reason}\n\nSquadUp menyemak setiap mesej supaya chat kekal selamat untuk semua.`);
    } else Alert.alert('Ralat', res.error);
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
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas, paddingTop: 55 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: palette.border },
  backBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: palette.blueSoft },
  title: { fontSize: 18, fontWeight: '900', color: palette.navy }, subtitle: { color: palette.muted, fontSize: 12, marginTop: 3 },
  empty: { textAlign: 'center', color: palette.muted, marginTop: 40, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, maxWidth: '85%' }, rowMine: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 19, paddingVertical: 10, paddingHorizontal: 13, flexShrink: 1 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 5, ...cardShadow },
  bubbleMine: { backgroundColor: palette.blue, borderBottomRightRadius: 5 },
  sender: { fontSize: 12, fontWeight: '800', color: palette.blue, marginBottom: 3 },
  content: { fontSize: 15, color: palette.navy, lineHeight: 21 }, contentMine: { color: '#fff' },
  time: { fontSize: 10, color: palette.muted, marginTop: 5, alignSelf: 'flex-end' }, timeMine: { color: '#D5E8FF' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 18, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: palette.border },
  input: { flex: 1, minHeight: 45, maxHeight: 115, backgroundColor: '#F0F5FC', borderRadius: 23, paddingHorizontal: 17, paddingVertical: 10, fontSize: 15, color: palette.navy },
  sendBtn: { backgroundColor: palette.blue, borderRadius: 25, width: 47, height: 47, alignItems: 'center', justifyContent: 'center', ...cardShadow },
});
