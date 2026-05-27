import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  // Unauthenticated users see the in-app landing page (Welcome) first.
  // Returning users with a token go straight to the home tabs.
  return <Redirect href={user ? '/(tabs)' : '/(auth)/welcome'} />;
}
