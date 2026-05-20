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
      {responders.map((r) => (
        <View key={r.id} style={styles.row}>
          <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
          <View style={styles.nameGroup}>
            <Text style={styles.name}>{r.name}</Text>
            <Text style={styles.distance}>{r.distance}m away</Text>
          </View>
        </View>
      ))}
    </View>
  );
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
});
