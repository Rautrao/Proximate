import { useEffect, useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { getSocket } from '@/services/socket';
import { setResponderMode } from '@/services/api';

interface IncidentResponder {
  id: string;
  name: string;
  distance?: number;
  acknowledgedAt?: number;
  routeDistanceMeters?: number;
  routeDurationSeconds?: number;
}

interface NearbyIncident {
  id: string;
  victimName: string;
  tier: number;
  radius: number;
  startedAt: number;
  status: 'active' | 'cancelled' | 'resolved';
  location?: { lat: number; lng: number };
  responders?: IncidentResponder[];
  verifiedBy?: string[];
  flaggedBy?: string[];
  escalationLog?: { tier: number; radius: number; at: number }[];
  pendingVerification?: boolean;
}

function elapsed(startedAt: number): string {
  const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem.toString().padStart(2, '0')}s`;
}

export default function ResponderScreen() {
  const { user, setResponderEnabled } = useAuthStore();
  const responderOn = Boolean(user?.responderEnabled);
  const [nearbyIncidents, setNearbyIncidents] = useState<NearbyIncident[]>([]);
  const [syncWarn, setSyncWarn] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ackedIds, setAckedIds] = useState<Set<string>>(new Set());
  const activeIncident = nearbyIncidents.find((i) => i.id === activeId) ?? null;

  // Local-first: flip the store + emit the socket event immediately so the
  // UI never feels stuck. The HTTP sync runs in the background; if it fails
  // (e.g. the mock server was restarted and lost the user record) we just
  // show a small notice — the local toggle still works.
  function toggle(next: boolean) {
    if (!user?.token) return;
    setResponderEnabled(next);
    setSyncWarn('');
    const sock = getSocket();
    if (sock?.connected) {
      sock.emit(next ? 'citizen:subscribe_responder' : 'citizen:unsubscribe_responder');
    }
    setResponderMode(user.token, next).catch((e) => {
      setSyncWarn(
        e instanceof Error ? e.message : 'Server preference could not be saved.'
      );
    });
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
    setAckedIds((s) => {
      const next = new Set(s);
      next.add(incidentId);
      return next;
    });
  }
  function verify(incidentId: string) {
    const sock = getSocket();
    if (sock?.connected) sock.emit('responder:verify', { incidentId });
  }
  function flagFalse(incidentId: string) {
    const sock = getSocket();
    if (sock?.connected) sock.emit('responder:flag_false_alarm', { incidentId });
  }
  function openInMaps(loc?: { lat: number; lng: number }) {
    if (!loc) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  }
  function respondAndOpen(incidentId: string) {
    acknowledge(incidentId);
    setActiveId(incidentId);
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
            thumbColor={responderOn ? '#fbbf24' : '#71717a'}
            trackColor={{ true: '#854D0E', false: '#27272a' }}
          />
        </View>
        {syncWarn ? <Text style={styles.syncWarn}>Couldn't sync with server: {syncWarn}</Text> : null}

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
                const ackCount = (inc.responders || []).length;
                const youAcked = ackedIds.has(inc.id);
                return (
                  <Pressable
                    key={inc.id}
                    onPress={() => setActiveId(inc.id)}
                    style={({ pressed }) => [styles.alertCard, pressed && { opacity: 0.92 }]}
                  >
                    <View style={styles.alertHead}>
                      <View style={styles.alertPulse} />
                      <Text style={styles.alertVictim}>{inc.victimName}</Text>
                      <Text style={styles.alertTier}>TIER {inc.tier}</Text>
                    </View>
                    <Text style={styles.alertMeta}>
                      {inc.radius}m radius · started {elapsed(inc.startedAt)} ago
                      {ackCount > 0 ? ` · ${ackCount} responding` : ''}
                    </Text>
                    <View style={styles.alertActions}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          respondAndOpen(inc.id);
                        }}
                        style={({ pressed }) => [
                          styles.respondBtn,
                          youAcked && styles.respondBtnAcked,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Ionicons
                          name={youAcked ? 'checkmark-circle' : 'flash'}
                          size={16}
                          color="#0a0a0a"
                        />
                        <Text style={styles.respondText}>
                          {youAcked ? 'On the way · view' : "I'm on my way"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          setActiveId(inc.id);
                        }}
                        style={({ pressed }) => [
                          styles.detailsBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={styles.detailsBtnText}>Details</Text>
                        <Ionicons name="chevron-forward" size={14} color="#fbbf24" />
                      </Pressable>
                    </View>
                  </Pressable>
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

      <IncidentDetailSheet
        incident={activeIncident}
        youAcked={activeIncident ? ackedIds.has(activeIncident.id) : false}
        onClose={() => setActiveId(null)}
        onAck={() => activeIncident && acknowledge(activeIncident.id)}
        onVerify={() => activeIncident && verify(activeIncident.id)}
        onFlag={() => activeIncident && flagFalse(activeIncident.id)}
        onNavigate={() => openInMaps(activeIncident?.location)}
      />
    </SafeAreaView>
  );
}

/* ── Detail sheet — opens when a card is tapped ─────────────────────────── */
function IncidentDetailSheet({
  incident,
  youAcked,
  onClose,
  onAck,
  onVerify,
  onFlag,
  onNavigate,
}: {
  incident: NearbyIncident | null;
  youAcked: boolean;
  onClose: () => void;
  onAck: () => void;
  onVerify: () => void;
  onFlag: () => void;
  onNavigate: () => void;
}) {
  if (!incident) {
    return <Modal visible={false} transparent animationType="fade" />;
  }
  const responders = incident.responders || [];
  const verifications = (incident.verifiedBy || []).length;
  const falseFlags = (incident.flaggedBy || []).length;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={sheet.panel}>
          {/* Header */}
          <View style={sheet.header}>
            <View style={sheet.headerLeft}>
              <View style={sheet.pulse} />
              <Text style={sheet.headerName}>{incident.victimName}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#a1a1aa" />
            </Pressable>
          </View>

          <View style={sheet.tierRow}>
            <Text style={sheet.tierBadge}>TIER {incident.tier}</Text>
            <Text style={sheet.tierMeta}>
              {incident.radius}m radius · {elapsed(incident.startedAt)} elapsed
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
            {/* Location */}
            <Text style={sheet.label}>LOCATION</Text>
            {incident.location ? (
              <>
                <Text style={sheet.coord}>
                  {incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}
                </Text>
                <Pressable
                  onPress={onNavigate}
                  style={({ pressed }) => [sheet.mapBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="navigate" size={15} color="#fafafa" />
                  <Text style={sheet.mapBtnText}>Open in Maps</Text>
                </Pressable>
              </>
            ) : (
              <Text style={sheet.dim}>Location not shared.</Text>
            )}

            {/* Other responders */}
            <Text style={sheet.label}>
              RESPONDERS ({responders.length}){youAcked ? ' · INCLUDING YOU' : ''}
            </Text>
            {responders.length === 0 ? (
              <Text style={sheet.dim}>No one has acknowledged yet.</Text>
            ) : (
              responders.map((r) => {
                const eta = r.routeDurationSeconds
                  ? `${Math.round(r.routeDurationSeconds / 60)} min`
                  : null;
                return (
                  <View key={r.id} style={sheet.responderRow}>
                    <View style={sheet.responderDot} />
                    <Text style={sheet.responderName}>{r.name}</Text>
                    <Text style={sheet.responderMeta}>
                      {r.distance ? `${r.distance}m away` : '—'}
                      {eta ? ` · ETA ${eta}` : ''}
                    </Text>
                  </View>
                );
              })
            )}

            {/* Community verification */}
            <Text style={sheet.label}>COMMUNITY VERIFICATION</Text>
            <View style={sheet.verifyRow}>
              <View style={sheet.verifyStat}>
                <Text style={sheet.verifyStatNum}>{verifications}</Text>
                <Text style={sheet.verifyStatLabel}>verified</Text>
              </View>
              <View style={sheet.verifyStat}>
                <Text style={[sheet.verifyStatNum, { color: '#f87171' }]}>{falseFlags}</Text>
                <Text style={sheet.verifyStatLabel}>flagged false</Text>
              </View>
              {incident.pendingVerification ? (
                <Text style={sheet.pausedTag}>PAUSED PENDING REVIEW</Text>
              ) : null}
            </View>

            {/* Escalation log */}
            {(incident.escalationLog || []).length > 0 ? (
              <>
                <Text style={sheet.label}>ESCALATION</Text>
                {(incident.escalationLog || []).map((step, i) => (
                  <View key={i} style={sheet.escRow}>
                    <Text style={sheet.escTier}>Tier {step.tier}</Text>
                    <Text style={sheet.escMeta}>
                      {step.radius}m · {elapsed(step.at)} ago
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </ScrollView>

          {/* Actions */}
          <View style={sheet.actions}>
            <Pressable
              onPress={onAck}
              disabled={youAcked}
              style={({ pressed }) => [
                sheet.primaryBtn,
                youAcked && sheet.primaryBtnDone,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name={youAcked ? 'checkmark-circle' : 'flash'}
                size={16}
                color="#0a0a0a"
              />
              <Text style={sheet.primaryBtnText}>
                {youAcked ? 'You are on your way' : "I'm on my way"}
              </Text>
            </Pressable>
            <View style={sheet.secondaryRow}>
              <Pressable
                onPress={onVerify}
                style={({ pressed }) => [sheet.secondaryBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="shield-checkmark-outline" size={14} color="#22c55e" />
                <Text style={[sheet.secondaryText, { color: '#22c55e' }]}>This is real</Text>
              </Pressable>
              <Pressable
                onPress={onFlag}
                style={({ pressed }) => [sheet.secondaryBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="alert-circle-outline" size={14} color="#f87171" />
                <Text style={[sheet.secondaryText, { color: '#f87171' }]}>False alarm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
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
  syncWarn: {
    color: '#f59e0b',
    fontSize: 11,
    marginTop: -12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

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
  alertActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  respondBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f87171',
    paddingVertical: 12,
    borderRadius: 999,
  },
  respondBtnAcked: { backgroundColor: '#22c55e' },
  respondText: { color: '#0a0a0a', fontSize: 13, fontWeight: '700' },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailsBtnText: { color: '#fbbf24', fontSize: 12, fontWeight: '600' },

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

const sheet = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#0f0f12',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f87171' },
  headerName: { color: '#fafafa', fontSize: 18, fontWeight: '700' },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  tierBadge: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tierMeta: { color: '#a1a1aa', fontSize: 12 },
  label: {
    color: '#52525b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 14,
    marginBottom: 8,
  },
  coord: { color: '#fafafa', fontSize: 13, fontFamily: Platform.select({ web: 'monospace', default: undefined }) },
  dim: { color: '#71717a', fontSize: 13, fontStyle: 'italic' },
  mapBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 8,
  },
  mapBtnText: { color: '#fafafa', fontSize: 12, fontWeight: '600' },
  responderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  responderDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' },
  responderName: { color: '#fafafa', fontSize: 13, fontWeight: '600' },
  responderMeta: { color: '#71717a', fontSize: 12, marginLeft: 'auto' },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  verifyStat: { alignItems: 'flex-start' },
  verifyStatNum: { color: '#22c55e', fontSize: 22, fontWeight: '700' },
  verifyStatLabel: { color: '#71717a', fontSize: 10, letterSpacing: 1, marginTop: 2 },
  pausedTag: {
    marginLeft: 'auto',
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  escRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  escTier: { color: '#fafafa', fontSize: 12, fontWeight: '600' },
  escMeta: { color: '#71717a', fontSize: 12 },
  actions: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#1f1f23',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fbbf24',
    paddingVertical: 14,
    borderRadius: 999,
  },
  primaryBtnDone: { backgroundColor: '#22c55e' },
  primaryBtnText: { color: '#0a0a0a', fontSize: 14, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingVertical: 12,
    borderRadius: 999,
  },
  secondaryText: { fontSize: 12, fontWeight: '600' },
});
