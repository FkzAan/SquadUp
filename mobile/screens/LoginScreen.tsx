import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { signIn, signUp } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

export default function LoginScreen() {
    const { t } = useLanguage();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function submit() {
        if (!email || !password || (mode === 'signup' && !name)) {
            Alert.alert(t('fillFields'));
            return;
        }
        setLoading(true);
        const err = mode === 'signup' ? await signUp(name, email, password) : await signIn(email, password);
        setLoading(false);
        if (err) Alert.alert(t('error'), err);
    }

    return (
        <View style={s.container}>
            <View style={s.languageSelector}><LanguageSelector /></View>
            <Text style={s.logo}>SquadUp</Text>
            <Text style={s.tagline}>{t('loginTagline')}</Text>

            {mode === 'signup' && (
                <TextInput style={s.input} placeholder={t('nickname')} value={name} onChangeText={setName} />
            )}
            <TextInput
                style={s.input}
                placeholder={t('email')}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={s.input}
                placeholder={t('passwordHint')}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={s.button} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={s.buttonText}>{mode === 'login' ? t('login') : t('signup')}</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                <Text style={s.link}>
                    {mode === 'login' ? t('switchSignup') : t('switchLogin')}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
    languageSelector: { position: 'absolute', top: 60, right: 24 },
    logo: { fontSize: 36, fontWeight: '800', color: '#2563eb', textAlign: 'center' },
    tagline: { textAlign: 'center', color: '#6b7280', marginBottom: 32, marginTop: 4 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, marginBottom: 12 },
    button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    link: { textAlign: 'center', color: '#2563eb', marginTop: 16 },
});