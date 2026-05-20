import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) return null;
  if (user) return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#111827' },
      }}
    />
  );
}
