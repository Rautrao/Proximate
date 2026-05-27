import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SOSButton } from '@/components/SOSButton';
import { useShakeTrigger } from '@/hooks/useShakeTrigger';
import { useVolumeButtonTrigger } from '@/hooks/useVolumeButtonTrigger';
import { useSOSEngine } from '@/hooks/useSOSEngine';
import { useAuthStore } from '@/store/auth';
import { usePreferencesStore } from '@/store/preferences';
import { requestLocationPermission } from '@/services/location';
import { connectSocket } from '@/services/socket';
import { registerFCMToken } from '@/services/api';

export default function HomeScreen() {
  const { triggerSOS, status } = useSOSEngine();
  const user = useAuthStore((s) => s.user);
  const videoEnabled = usePreferencesStore((s) => s.videoEnabled);
  const setVideoEnabled = usePreferencesStore((s) => s.setVideoEnabled);

  // Shake triggers SOS only when the app is idle
  useShakeTrigger(triggerSOS, status === 'idle');
  // Triple-press volume key (SPACE on web demo) — matches Assignment 2's
  // stated "pressing volume/power buttons" primary trigger mechanism
  useVolumeButtonTrigger(triggerSOS, status === 'idle');

  useEffect(() => {
    if (!user?.token) return;
    requestLocationPermission();
    connectSocket(user.token);

    // Tell the server our FCM push token (stored on the device by expo-notifications).
    // This enables push alerts when the app is backgrounded.
    // To activate: install expo-notifications and replace the placeholder below.
    const fcmToken: string | null = null; // TODO: await Notifications.getExpoPushTokenAsync()
    if (fcmToken) registerFCMToken(user.id, user.token, fcmToken);

    // Intentionally NOT disconnecting on unmount: the socket needs to survive
    // navigation to /sos-active. The escalateTier flow awaits GPS permission
    // before emitting — if we tear down the socket here, the await lets home
    // unmount first and the emit silently drops. The socket disconnects when
    // the user explicitly signs out (see Settings → handleLogout).
  }, [user]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Proximate</Text>
          <View style={styles.statusBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#22C55E" />
            <Text style={styles.statusText}>Protected</Text>
          </View>
        </View>

        <Text style={styles.greeting}>
          Hello, {user?.name?.split(' ')[0] ?? 'there'}
        </Text>

        {/* SOS zone */}
        <View style={styles.sosZone}>
          <SOSButton onTrigger={triggerSOS} />
        </View>

        {/* Trigger hint */}
        <View style={styles.hintRow}>
          <Ionicons name="phone-portrait-outline" size={14} color="#4B5563" />
          <Text style={styles.hint}>Hold button · shake phone · triple-press volume key</Text>
        </View>

        {/* Feature pills — Video stream is a real toggle (privacy control) */}
        <View style={styles.pills}>
          <View style={styles.pill}>
            <Ionicons name="navigate" size={13} color="#6B7280" />
            <Text style={styles.pillText}>Live GPS</Text>
          </View>
          <Pressable
            onPress={() => setVideoEnabled(!videoEnabled)}
            style={({ pressed }) => [
              styles.pill,
              videoEnabled && styles.pillActive,
              pressed && styles.pillPressed,
            ]}
          >
            <Ionicons
              name={videoEnabled ? 'videocam' : 'videocam-off-outline'}
              size={13}
              color={videoEnabled ? '#22C55E' : '#6B7280'}
            />
            <Text style={[styles.pillText, videoEnabled && styles.pillTextActive]}>
              {videoEnabled ? 'Video on' : 'Video off'}
            </Text>
          </Pressable>
          <View style={styles.pill}>
            <Ionicons name="people-outline" size={13} color="#6B7280" />
            <Text style={styles.pillText}>500m radius</Text>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  appName: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#052e16',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#166534',
  },
  statusText: { color: '#22C55E', fontSize: 12, fontWeight: '600' },
  greeting: {
    color: '#9CA3AF',
    fontSize: 15,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 0,
  },
  sosZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
  },
  hint: { color: '#4B5563', fontSize: 12 },
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  pillActive: {
    backgroundColor: '#052e16',
    borderColor: '#166534',
  },
  pillPressed: { opacity: 0.7 },
  pillText: { color: '#6B7280', fontSize: 11 },
  pillTextActive: { color: '#22C55E', fontWeight: '600' },
});
