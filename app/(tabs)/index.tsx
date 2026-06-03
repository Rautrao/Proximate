import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SOSButton } from '@/components/SOSButton';
import { useShakeTrigger } from '@/hooks/useShakeTrigger';
import { useVolumeButtonTrigger } from '@/hooks/useVolumeButtonTrigger';
import { useSOSEngine } from '@/hooks/useSOSEngine';
import { useAuthStore } from '@/store/auth';
import { usePreferencesStore } from '@/store/preferences';
import { requestLocationPermission } from '@/services/location';
import { connectSocket, getSocket } from '@/services/socket';
import { registerFCMToken } from '@/services/api';

interface NearbyIncident {
  id: string;
  victimName: string;
  tier: number;
  radius: number;
  startedAt: number;
  status: 'active' | 'cancelled' | 'resolved';
}

export default function HomeScreen() {
  const { triggerSOS, status } = useSOSEngine();
  const user = useAuthStore((s) => s.user);
  const responderOn = Boolean(user?.responderEnabled);
  const videoEnabled = usePreferencesStore((s) => s.videoEnabled);
  const setVideoEnabled = usePreferencesStore((s) => s.setVideoEnabled);
  const [nearbyIncidents, setNearbyIncidents] = useState<NearbyIncident[]>([]);

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

  // Subscribe to the responders feed whenever the toggle is on. The server
  // pushes a snapshot back so we populate immediately and then updates flow
  // in via incident:update / incident:cancelled.
  useEffect(() => {
    if (!user?.token) return;
    const sock = getSocket();
    if (!sock) return;

    function onSnapshot(list: NearbyIncident[]) {
      setNearbyIncidents(list.filter((i) => i.status === 'active'));
    }
    function onUpdate(inc: NearbyIncident) {
      setNearbyIncidents((cur) => {
        if (inc.status !== 'active') return cur.filter((x) => x.id !== inc.id);
        const idx = cur.findIndex((x) => x.id === inc.id);
        if (idx === -1) return [inc, ...cur];
        const next = [...cur];
        next[idx] = inc;
        return next;
      });
    }
    function onCancelled({ id }: { id: string }) {
      setNearbyIncidents((cur) => cur.filter((x) => x.id !== id));
    }

    if (responderOn) {
      sock.on('responder:snapshot', onSnapshot);
      sock.on('incident:update', onUpdate);
      sock.on('incident:cancelled', onCancelled);
      // The server checks the user's persisted flag on connect, but if the
      // toggle flipped after connect we still need to ask it to (re)join.
      const askToJoin = () => sock.emit('citizen:subscribe_responder');
      if (sock.connected) askToJoin();
      else sock.on('connect', askToJoin);

      return () => {
        sock.off('responder:snapshot', onSnapshot);
        sock.off('incident:update', onUpdate);
        sock.off('incident:cancelled', onCancelled);
        sock.off('connect', askToJoin);
      };
    } else {
      setNearbyIncidents([]);
      if (sock.connected) sock.emit('citizen:unsubscribe_responder');
    }
  }, [responderOn, user?.token]);

  function acknowledge(incidentId: string) {
    const sock = getSocket();
    if (sock?.connected) sock.emit('responder:ack', { incidentId, distance: 280 });
  }

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

        {responderOn && nearbyIncidents.length > 0 ? (
          <View style={styles.alertsCard}>
            <View style={styles.alertsHead}>
              <View style={styles.alertsPulse} />
              <Text style={styles.alertsTitle}>
                {nearbyIncidents.length === 1
                  ? 'Distress signal nearby'
                  : `${nearbyIncidents.length} active distress signals`}
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              {nearbyIncidents.map((inc) => (
                <View key={inc.id} style={styles.alertRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertVictim}>{inc.victimName}</Text>
                    <Text style={styles.alertMeta}>
                      Tier {inc.tier} · {inc.radius}m radius
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => acknowledge(inc.id)}
                    style={({ pressed }) => [styles.alertAck, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.alertAckText}>Respond</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

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

  /* Nearby alerts banner */
  alertsCard: {
    width: '100%',
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    backgroundColor: 'rgba(248, 113, 113, 0.06)',
  },
  alertsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  alertsPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171' },
  alertsTitle: { color: '#fafafa', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(248, 113, 113, 0.2)',
  },
  alertVictim: { color: '#fafafa', fontSize: 13, fontWeight: '600' },
  alertMeta: { color: '#a1a1aa', fontSize: 11, marginTop: 2 },
  alertAck: {
    backgroundColor: '#f87171',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  alertAckText: { color: '#0a0a0a', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
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
