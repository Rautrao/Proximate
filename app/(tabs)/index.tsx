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
import { registerFCMToken } from '@/services/api';

export default function HomeScreen() {
  const { triggerSOS, status } = useSOSEngine();
  const user = useAuthStore((s) => s.user);
  const responderOn = Boolean(user?.responderEnabled);
  const videoEnabled = usePreferencesStore((s) => s.videoEnabled);
  const setVideoEnabled = usePreferencesStore((s) => s.setVideoEnabled);

  // Shake triggers SOS only when the app is idle
  useShakeTrigger(triggerSOS, status === 'idle');
  // Triple-press volume key (SPACE on web demo) — matches Assignment 2's
  // stated "pressing volume/power buttons" primary trigger mechanism
  useVolumeButtonTrigger(triggerSOS, status === 'idle');

  useEffect(() => {
    if (!user?.token) return;
    // Socket + GPS are wired in (tabs)/_layout.tsx; this hook only deals with
    // the (currently placeholder) FCM token registration.
    const fcmToken: string | null = null; // TODO: await Notifications.getExpoPushTokenAsync()
    if (fcmToken) registerFCMToken(user.id, user.token, fcmToken);
  }, [user]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Proximate</Text>
          {responderOn ? (
            <View style={styles.responderBadge}>
              <View style={styles.responderDot} />
              <Text style={styles.responderText}>Listening</Text>
            </View>
          ) : (
            <View style={styles.statusBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#22C55E" />
              <Text style={styles.statusText}>Protected</Text>
            </View>
          )}
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
  safe: { flex: 1, backgroundColor: '#09090b' },
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
    color: '#fafafa',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusText: { color: '#22C55E', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  responderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  responderDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fbbf24' },
  responderText: { color: '#fbbf24', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  greeting: {
    color: '#71717a',
    fontSize: 13,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 0,
    letterSpacing: 0.5,
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
  hint: { color: '#52525b', fontSize: 11, letterSpacing: 0.5 },
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#18181b',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  pillActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  pillPressed: { opacity: 0.7 },
  pillText: { color: '#71717a', fontSize: 11, letterSpacing: 0.4 },
  pillTextActive: { color: '#22C55E', fontWeight: '600' },
});
