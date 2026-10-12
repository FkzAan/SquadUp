import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { signIn, signUp } from '../services/authService';

export default function LoginScreen() {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function submit() {
        if (!email || !password || (mode === 'signup' && !name)) {
            Alert.alert('Lengkapkan semua ruangan');
            return;
        }
        setLoading(true);
        const err = mode === 'signup' ? await signUp(name, email, password) : await signIn(email, password);
        setLoading(false);
        if (err) Alert.alert('Ralat', err);
    }

    return (
        <View style={s.container}>
            <Text style={s.logo}>SquadUp</Text>
            <Text style={s.tagline}>Cari +1 untuk aktiviti kamu, tanpa kekok.</Text>

            {mode === 'signup' && (
                <TextInput style={s.input} placeholder="Nama panggilan" value={name} onChangeText={setName} />
            )}
            <TextInput
                style={s.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={s.input}
                placeholder="Password (min 6 aksara)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={s.button} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={s.buttonText}>{mode === 'login' ? 'Log Masuk' : 'Daftar'}</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                <Text style={s.link}>
                    {mode === 'login' ? 'Belum ada akaun? Daftar' : 'Dah ada akaun? Log masuk'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
    logo: { fontSize: 36, fontWeight: '800', color: '#2563eb', textAlign: 'center' },
    tagline: { textAlign: 'center', color: '#6b7280', marginBottom: 32, marginTop: 4 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, marginBottom: 12 },
    button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    link: { textAlign: 'center', color: '#2563eb', marginTop: 16 },
});