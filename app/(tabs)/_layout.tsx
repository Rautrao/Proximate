import { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { connectSocket } from '@/services/socket';
import { requestLocationPermission } from '@/services/location';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
}: {
  name: IoniconName;
  focused: boolean;
}) {
  return <Ionicons name={name} size={22} color={focused ? '#fbbf24' : '#52525b'} />;
}

export default function TabLayout() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // Connect socket + request location once for the whole authed shell —
  // otherwise the connection lives only on the Home tab's lifecycle, which
  // means deep-linking straight to Responder or Settings would have no
  // socket and never receive incident events.
  useEffect(() => {
    if (!user?.token) return;
    requestLocationPermission();
    connectSocket(user.token);
  }, [user?.token]);

  if (!isHydrated) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#09090b',
          borderTopColor: '#27272a',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#fbbf24',
        tabBarInactiveTintColor: '#52525b',
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 1.2, fontWeight: '600', textTransform: 'uppercase' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'shield' : 'shield-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="responder"
        options={{
          title: 'Responder',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'radio' : 'radio-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'settings' : 'settings-outline'}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
