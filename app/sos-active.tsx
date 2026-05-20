import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EscalationRing } from '@/components/EscalationRing';
import { ResponderList } from '@/components/ResponderList';
import { useSOSEngine } from '@/hooks/useSOSEngine';
import { useSOSStore } from '@/store/sos';
import { CANCEL_GRACE_SECONDS, ESCALATION_TIERS } from '@/constants/escalation';

export default function SOSActiveScreen() {
  const { cancelSOS, currentTier } = useSOSEngine();
  const triggeredAt = useSOSStore((s) => s.triggeredAt);

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [nextEscIn, setNextEscIn] = useState(60);
  const cancelOpacity = useRef(new Animated.Value(1)).current;

  // Tick every second
  useEffect(() => {
    const start = triggeredAt ?? Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setSecondsElapsed(elapsed);

      // Seconds since current tier started
      const tierElapsed = elapsed - (currentTier - 1) * 60;
      setNextEscIn(Math.max(0, 60 - tierElapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [triggeredAt, currentTier]);

  // Fade cancel button after grace period
  useEffect(() => {
    if (secondsElapsed >= CANCEL_GRACE_SECONDS) {
      Animated.timing(cancelOpacity, {
        toValue: 0.35,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [secondsElapsed >= CANCEL_GRACE_SECONDS, cancelOpacity]);

  const inGrace = secondsElapsed < CANCEL_GRACE_SECONDS;
  const tierConfig = ESCALATION_TIERS[Math.min(currentTier, ESCALATION_TIERS.length) - 1];
  const isLastTier = currentTier >= ESCALATION_TIERS.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Ionicons name="warning" size={22} color="#FCA5A5" />
          <Text style={styles.headerText}>EMERGENCY ACTIVE</Text>
          <View style={styles.elapsed}>
            <Text style={styles.elapsedText}>{formatTime(secondsElapsed)}</Text>
          </View>
        </View>

        {/* Escalation ring */}
        <View style={styles.ringArea}>
          <EscalationRing />
        </View>

        {/* Next escalation countdown */}
        {!isLastTier && (
          <View style={styles.escalationRow}>
            <Ionicons name="arrow-up-circle-outline" size={16} color="#9CA3AF" />
            <Text style={styles.escalationText}>
              Escalating to {ESCALATION_TIERS[currentTier].label} in{' '}
              <Text style={{ color: tierConfig.color }}>{nextEscIn}s</Text>
            </Text>
          </View>
        )}
        {isLastTier && (
          <View style={styles.escalationRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#22C55E" />
            <Text style={styles.escalationText}>
              Maximum radius reached · Police notified
            </Text>
          </View>
        )}

        {/* Responders */}
        <View style={styles.responderArea}>
          <ResponderList />
        </View>

        {/* Cancel button */}
        <Animated.View style={[styles.cancelWrap, { opacity: cancelOpacity }]}>
          <Pressable
            onPress={cancelSOS}
            style={({ pressed }) => [
              styles.cancelBtn,
              inGrace && styles.cancelBtnGrace,
              pressed && styles.cancelBtnPressed,
            ]}
          >
            <Text style={[styles.cancelText, inGrace && styles.cancelTextGrace]}>
              {inGrace
                ? `Cancel SOS  ·  ${CANCEL_GRACE_SECONDS - secondsElapsed}s`
                : 'Cancel SOS'}
            </Text>
          </Pressable>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0101' },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  elapsed: {
    backgroundColor: '#1A0A0A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#3F1A1A',
  },
  elapsedText: { color: '#F87171', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  ringArea: {
    marginVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escalationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
  },
  escalationText: { color: '#9CA3AF', fontSize: 13 },
  responderArea: { flex: 1, width: '100%' },
  cancelWrap: { width: '100%', marginBottom: 20 },
  cancelBtn: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  cancelBtnGrace: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  cancelBtnPressed: { opacity: 0.75 },
  cancelText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },
  cancelTextGrace: { color: '#F9FAFB', fontSize: 16 },
});
