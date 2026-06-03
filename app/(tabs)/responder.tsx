import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { getSocket } from '@/services/socket';
import { setResponderMode } from '@/services/api';

interface NearbyIncident {
  id: string;
  victimName: string;
  tier: number;
  radius: number;
  startedAt: number;
  status: 'active' | 'cancelled' | 'resolved';
  responders?: { id: string; name: string }[];
}

export default function ResponderScreen() {
  const { user, setResponderEnabled } = useAuthStore();
  const responderOn = Boolean(user?.responderEnabled);
  const [nearbyIncidents, setNearbyIncidents] = useState<NearbyIncident[]>([]);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    if (!user?.token || busy) return;
    setBusy(true);
    setResponderEnabled(next);
    try {
      await setResponderMode(user.token, next);
      const sock = getSocket();
      if (sock.connected) {
        sock.emit(next ? 'citizen:subscribe_responder' : 'citizen:unsubscribe_responder');
      }
    } catch (e) {
      setResponderEnabled(!next);
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  // Only listen for alerts when responder mode is on. Same subscribe path the
  // server uses for the dashboard, so the incident:update event shape is
  // identical to what the responder portal consumes.
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
    }
  }, [responderOn, user?.token]);

  function acknowledge(incidentId: string) {
    const sock = getSocket();
    if (sock?.connected) sock.emit('responder:ack', { incidentId, distance: 280 });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Responder</Text>
        <Text style={styles.subtitle}>
          Help nearby users when they trigger SOS. You only receive alerts while
          this mode is on.
        </Text>

        {/* Mode toggle card */}
        <View style={[styles.modeCard, responderOn && styles.modeCardOn]}>
          <View style={[styles.modeIcon, responderOn && styles.modeIconOn]}>
            <Ionicons
              name={responderOn ? 'radio' : 'radio-outline'}
              size={22}
              color={responderOn ? '#fbbf24' : '#71717a'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modeTitle}>Responder mode</Text>
            <Text style={styles.modeHint}>
              {responderOn
                ? 'You will be notified about nearby distress signals.'
                : 'Turn on to start receiving nearby distress alerts.'}
            </Text>
          </View>
          <Switch
            value={responderOn}
            onValueChange={toggle}
            disabled={busy}
            thumbColor={responderOn ? '#fbbf24' : '#71717a'}
            trackColor={{ true: '#854D0E', false: '#27272a' }}
          />
        </View>

        {/* Alerts list */}
        {responderOn ? (
          nearbyIncidents.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyPulse} />
              <Text style={styles.emptyTitle}>Listening for alerts</Text>
              <Text style={styles.emptyHint}>
                No active distress signals near you. You'll be notified the moment
                someone triggers SOS.
              </Text>
            </View>
          ) : (
            <View style={styles.alertsBlock}>
              <Text style={styles.alertsLabel}>
                {nearbyIncidents.length} ACTIVE {nearbyIncidents.length === 1 ? 'ALERT' : 'ALERTS'}
              </Text>
              {nearbyIncidents.map((inc) => {
                const ackedByMe = (inc.responders || []).length > 0;
                return (
                  <View key={inc.id} style={styles.alertCard}>
                    <View style={styles.alertHead}>
                      <View style={styles.alertPulse} />
                      <Text style={styles.alertVictim}>{inc.victimName}</Text>
                      <Text style={styles.alertTier}>TIER {inc.tier}</Text>
                    </View>
                    <Text style={styles.alertMeta}>
                      {inc.radius}m radius · started{' '}
                      {Math.max(0, Math.floor((Date.now() - inc.startedAt) / 1000))}s ago
                      {(inc.responders || []).length > 0
                        ? ` · ${(inc.responders || []).length} responding`
                        : ''}
                    </Text>
                    <Pressable
                      onPress={() => acknowledge(inc.id)}
                      style={({ pressed }) => [
                        styles.respondBtn,
                        ackedByMe && styles.respondBtnAcked,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Ionicons
                        name={ackedByMe ? 'checkmark-circle' : 'flash'}
                        size={16}
                        color="#0a0a0a"
                      />
                      <Text style={styles.respondText}>
                        {ackedByMe ? 'Acknowledged' : "I'm on my way"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          <View style={styles.offCard}>
            <Ionicons name="moon-outline" size={20} color="#71717a" />
            <Text style={styles.offTitle}>Mode is off</Text>
            <Text style={styles.offHint}>
              No alerts will be delivered while this is off. Your own SOS still
              works normally from the Home tab.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  title: { color: '#fafafa', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 18,
  },

  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f0f12',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  modeCardOn: {
    borderColor: 'rgba(251, 191, 36, 0.4)',
    backgroundColor: 'rgba(251, 191, 36, 0.04)',
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  modeIconOn: {
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  modeTitle: { color: '#fafafa', fontSize: 14, fontWeight: '600' },
  modeHint: { color: '#71717a', fontSize: 12, marginTop: 4, lineHeight: 17 },

  alertsBlock: { marginTop: 4 },
  alertsLabel: {
    color: '#52525b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
  },
  alertCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    backgroundColor: 'rgba(248, 113, 113, 0.06)',
    marginBottom: 12,
  },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171' },
  alertVictim: { color: '#fafafa', fontSize: 15, fontWeight: '700', flex: 1 },
  alertTier: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  alertMeta: { color: '#a1a1aa', fontSize: 12, marginTop: 8 },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: '#f87171',
    paddingVertical: 12,
    borderRadius: 999,
  },
  respondBtnAcked: { backgroundColor: '#22c55e' },
  respondText: { color: '#0a0a0a', fontSize: 13, fontWeight: '700' },

  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    backgroundColor: 'rgba(251, 191, 36, 0.04)',
  },
  emptyPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fbbf24',
    marginBottom: 14,
  },
  emptyTitle: { color: '#fafafa', fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  emptyHint: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },

  offCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#0f0f12',
  },
  offTitle: { color: '#a1a1aa', fontSize: 13, fontWeight: '600', marginTop: 8, letterSpacing: 0.3 },
  offHint: {
    color: '#52525b',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
});
