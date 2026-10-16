import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../../mobile/context/AuthContext';
import { LanguageProvider } from '../../mobile/context/LanguageContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </LanguageProvider>
  );
}

function Navigation() {
  const { session, role, loading, error } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!loading && !error && !session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session && role === 'player')}>
        <Stack.Screen name="(player)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session && role === 'admin')}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}