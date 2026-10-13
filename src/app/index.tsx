import { Redirect } from 'expo-router';
import { useAuth } from '../../mobile/context/AuthContext';
import AccessState from '../../mobile/components/AccessState';

export default function Entry() {
  const { session, role, loading, error, retry, logout } = useAuth();
  if (loading) return <AccessState />;
  if (error) return <AccessState title="Tak dapat semak akaun" error={error} retry={retry} logout={session ? logout : undefined} />;
  if (!session) return <Redirect href="/sign-in" />;
  if (role === 'admin') return <Redirect href="/admin" />;
  if (role === 'player') return <Redirect href="/(player)" />;
  return <AccessState />;
}
