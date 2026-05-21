import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSOSStore } from '@/store/sos';

export function ResponderList() {
  const responders = useSOSStore((s) => s.responders);

  if (responders.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="people-outline" size={32} color="#4B5563" />
        <Text style={styles.emptyTitle}>Alerting nearby users…</Text>
        <Text style={styles.emptySubtitle}>Responders will appear here once they acknowledge</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{responders.length} responding nearby</Text>
      {responders.map((r) => {
        const hasEta = typeof r.routeDurationSeconds === 'number';
        const distanceLabel = hasEta
          ? formatDistance(r.routeDistanceMeters!)
          : `${r.distance}m away`;
        return (
          <View key={r.id} style={styles.row}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <View style={styles.nameGroup}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.distance}>{distanceLabel}</Text>
            </View>
            {hasEta && (
              <View style={styles.etaPill}>
                <Ionicons name="time-outline" size={11} color="#22C55E" />
                <Text style={styles.etaText}>ETA {formatDuration(r.routeDurationSeconds!)}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  heading: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  nameGroup: { flex: 1 },
  name: { color: '#F9FAFB', fontSize: 14 },
  distance: { color: '#6B7280', fontSize: 12, marginTop: 1 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyTitle: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  emptySubtitle: {
    color: '#4B5563',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#052e16',
    borderColor: '#166534',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  etaText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
