import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const FEATURES = [
  {
    icon: 'location-outline' as const,
    title: 'Proximity-Based Alerts',
    text: 'Intelligent geofencing alerts nearby Proximate users within 500m of you.',
  },
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Hold · Shake · Volume',
    text: 'Three discreet triggers — designed for the moments you can\'t look at your screen.',
  },
  {
    icon: 'people-outline' as const,
    title: 'Community + Police',
    text: 'Emergency contacts, nearby verified users, and the nearest police station — all alerted in parallel.',
  },
  {
    icon: 'videocam-outline' as const,
    title: 'Live Video & Forensic Trail',
    text: 'Optional live camera stream and a full encrypted incident log for evidence.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Brand */}
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={20} color="#fafafa" />
          <Text style={styles.brand}>PROXIMATE</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            <View style={styles.dot} />
            <Text style={styles.eyebrowText}>PERSONAL SAFETY, RECONSIDERED</Text>
          </View>
          <Text style={styles.title}>Safety.</Text>
          <Text style={[styles.title, styles.titleMuted]}>Redefined.</Text>
          <Text style={styles.subtitle}>
            Advanced personal security technology. Proximity alerts, haptic
            triggers, and automated emergency response — engineered for the
            moments that matter.
          </Text>

          <Pressable
            onPress={() => router.push('/(auth)/quiz')}
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
            ]}
          >
            <Text style={styles.ctaText}>Get started</Text>
            <Ionicons name="arrow-forward" size={18} color="#0a0a0a" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [styles.secondaryCta, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.secondaryCtaText}>I already have an account</Text>
          </Pressable>
        </View>

        {/* Trust strip */}
        <View style={styles.trustStrip}>
          <Text style={styles.trustItem}>END-TO-END ENCRYPTED</Text>
          <Text style={styles.trustItem}>SUB-SECOND TRIGGERS</Text>
          <Text style={styles.trustItem}>PRIVACY BY DESIGN</Text>
          <Text style={styles.trustItem}>VERIFIED RESPONDERS</Text>
        </View>

        {/* Features */}
        <Text style={styles.sectionLabel}>CORE CAPABILITY</Text>
        <Text style={styles.sectionTitle}>
          Engineered for the seconds that decide everything.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={20} color="#fafafa" />
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Footer CTA */}
        <View style={styles.footerCta}>
          <Text style={styles.footerEyebrow}>READY?</Text>
          <Text style={styles.footerTitle}>Be among the first protected.</Text>
          <Pressable
            onPress={() => router.push('/(auth)/quiz')}
            style={({ pressed }) => [
              styles.cta,
              { marginTop: 24 },
              pressed && styles.ctaPressed,
            ]}
          >
            <Text style={styles.ctaText}>Create your account</Text>
            <Ionicons name="arrow-forward" size={18} color="#0a0a0a" />
          </Pressable>
          <Text style={styles.legal}>
            By continuing you agree to use Proximate only for genuine safety
            scenarios. Misuse is monitored and may be reported.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  container: { paddingHorizontal: 24, paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  brand: { color: '#fafafa', fontSize: 13, letterSpacing: 3, fontWeight: '600' },

  hero: { paddingTop: 40, paddingBottom: 48 },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
    borderRadius: 999,
    marginBottom: 28,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
  },
  eyebrowText: {
    color: '#a1a1aa',
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '600',
  },
  title: {
    color: '#fafafa',
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 58,
    letterSpacing: -2,
  },
  titleMuted: { color: '#52525b' },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 26,
    marginTop: 28,
    marginBottom: 36,
    maxWidth: 480,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fbbf24',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: '#0a0a0a', fontSize: 15, fontWeight: '600' },
  secondaryCta: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  secondaryCtaText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },

  trustStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    marginBottom: 48,
  },
  trustItem: {
    color: '#52525b',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
  },

  sectionLabel: {
    color: '#52525b',
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fafafa',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 32,
    maxWidth: 400,
  },

  features: { gap: 1, marginBottom: 64 },
  featureCard: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    padding: 24,
    borderRadius: 16,
    marginBottom: 8,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    color: '#fafafa',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 22,
  },
  featureText: {
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
  },

  footerCta: {
    paddingVertical: 32,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  footerEyebrow: {
    color: '#52525b',
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '600',
    marginBottom: 14,
  },
  footerTitle: {
    color: '#fafafa',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -1,
    maxWidth: 360,
  },
  legal: {
    color: '#52525b',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 20,
    textAlign: 'center',
  },
});
