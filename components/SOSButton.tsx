import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { HOLD_DURATION_MS } from '@/constants/escalation';
import { useSOSStore } from '@/store/sos';

interface Props {
  onTrigger: () => void;
}

export function SOSButton({ onTrigger }: Props) {
  const status = useSOSStore((s) => s.status);
  const isActive = status === 'active';

  const outerPulse = useRef(new Animated.Value(1)).current;
  const outerOpacity = useRef(new Animated.Value(0.3)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Continuous pulse ring when SOS is active
  useEffect(() => {
    if (isActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(outerPulse, { toValue: 1.4, duration: 900, useNativeDriver: true }),
            Animated.timing(outerOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(outerPulse, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(outerOpacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      outerPulse.setValue(1);
      outerOpacity.setValue(0.3);
    }
  }, [isActive, outerPulse, outerOpacity]);

  const handlePressIn = () => {
    if (isActive) return;
    holdProgress.setValue(0);
    holdAnim.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: false,
    });
    holdAnim.current.start();
  };

  const handlePressOut = () => {
    holdAnim.current?.stop();
    Animated.timing(holdProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const ringBorderColor = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(220,38,38,0.3)', 'rgba(220,38,38,0.9)'],
  });

  return (
    <View style={styles.wrapper}>
      {/* Expanding pulse ring — visible when SOS active */}
      <Animated.View
        style={[
          styles.pulseRing,
          { transform: [{ scale: outerPulse }], opacity: outerOpacity },
        ]}
      />

      {/* Hold-progress indicator ring */}
      <Animated.View
        style={[styles.progressRing, { borderColor: ringBorderColor }]}
      />

      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onTrigger}
        delayLongPress={HOLD_DURATION_MS}
        style={({ pressed }) => [
          styles.button,
          isActive && styles.buttonActive,
          pressed && !isActive && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="SOS emergency button — hold to activate"
      >
        <Text style={styles.label}>SOS</Text>
        {!isActive && <Text style={styles.hint}>Hold {HOLD_DURATION_MS / 1000}s</Text>}
      </Pressable>
    </View>
  );
}

const BUTTON_SIZE = 160;
const RING_SIZE = BUTTON_SIZE + 32;
const PULSE_SIZE = BUTTON_SIZE + 60;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
  },
  pulseRing: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    backgroundColor: 'rgba(220,38,38,0.25)',
  },
  progressRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  buttonActive: {
    backgroundColor: '#991B1B',
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#B91C1C',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 3,
  },
  hint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
