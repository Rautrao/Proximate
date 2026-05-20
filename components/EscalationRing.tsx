import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ESCALATION_TIERS } from '@/constants/escalation';
import { useSOSStore } from '@/store/sos';

export function EscalationRing() {
  const currentTier = useSOSStore((s) => s.currentTier);
  const tier = ESCALATION_TIERS[Math.min(currentTier, ESCALATION_TIERS.length) - 1];

  const expand = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    expand.setValue(0.5);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(expand, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [currentTier, expand, opacity]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: tier.color,
            transform: [{ scale: expand }],
            opacity,
          },
        ]}
      />
      <View style={styles.info}>
        <Text style={[styles.radius, { color: tier.color }]}>{tier.label}</Text>
        <Text style={styles.tierLabel}>Tier {currentTier} alert</Text>
      </View>
    </View>
  );
}

const RING = 200;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RING,
    height: RING,
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
  },
  info: { alignItems: 'center' },
  radius: { fontSize: 26, fontWeight: '800' },
  tierLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
});
