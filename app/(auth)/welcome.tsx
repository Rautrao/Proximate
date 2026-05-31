import { useRef } from 'react';
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
    text: 'Intelligent geofencing alerts nearby Proximate users within 500m of you — and adaptively expands the radius if no one responds.',
  },
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Hold · Shake · Volume',
    text: 'Three discreet triggers, designed for the moments you can\'t look at your screen or unlock your phone.',
  },
  {
    icon: 'people-outline' as const,
    title: 'Community + Police',
    text: 'Trusted contacts, nearby verified users, and the nearest police station — all alerted in parallel, not sequentially.',
  },
  {
    icon: 'videocam-outline' as const,
    title: 'Live Video & Forensic Trail',
    text: 'Optional live camera stream to responders. Every incident produces an encrypted, timestamped audit log for evidence.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Community Verification',
    text: 'A misuse-resistant network. Verified users vouch for genuine threats; false-alarm flags suppress bad actors before escalation.',
  },
  {
    icon: 'language-outline' as const,
    title: 'Built for India',
    text: 'Onboarding in 5 languages, real OpenStreetMap police-station lookup, and 1.5s GPS timeouts that survive weak rural networks.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Trigger in any state',
    text: 'Long-press the SOS button, shake the phone three times, or triple-press the volume key. Designed for panic — the user does not have to look at the screen.',
  },
  {
    n: '02',
    title: 'Alert the proximity network',
    text: 'Within seconds, Proximate users within 500m of you get a notification. Your trusted contacts get SMS. The nearest police station receives your live location.',
  },
  {
    n: '03',
    title: 'Escalate if response is slow',
    text: 'After 60 seconds the radius doubles to 1km. After another 60, it becomes 2km with police priority. The system never stops trying.',
  },
  {
    n: '04',
    title: 'Reassurance in real time',
    text: 'The moment a responder acknowledges, you see their name, distance, and ETA on your phone. As they move toward you, the ETA updates live.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const goToQuiz = () => router.push('/(auth)/quiz');
  const goToLogin = () => router.push('/(auth)/login');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky nav */}
        <View style={styles.navWrap}>
          <View style={styles.nav}>
            <View style={styles.navBrand}>
              <Ionicons name="shield-checkmark" size={18} color="#fafafa" />
              <Text style={styles.navBrandText}>PROXIMATE</Text>
            </View>
            <View style={styles.navLinks}>
              <Text style={styles.navLink}>Features</Text>
              <Text style={styles.navLink}>How it works</Text>
              <Text style={styles.navLink}>Technology</Text>
              <Text style={styles.navLink}>Contact</Text>
            </View>
            <View style={styles.navCtas}>
              <Pressable onPress={goToLogin} style={({ pressed }) => [styles.navLoginBtn, pressed && { opacity: 0.6 }]}>
                <Text style={styles.navLoginText}>Sign in</Text>
              </Pressable>
              <Pressable onPress={goToQuiz} style={({ pressed }) => [styles.navCta, pressed && { opacity: 0.85 }]}>
                <Text style={styles.navCtaText}>Get started</Text>
                <Ionicons name="arrow-forward" size={14} color="#0a0a0a" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            <View style={styles.dot} />
            <Text style={styles.eyebrowText}>PERSONAL SAFETY, RECONSIDERED</Text>
          </View>
          <Text style={styles.heroTitle}>Safety.</Text>
          <Text style={[styles.heroTitle, styles.heroTitleMuted]}>Redefined.</Text>
          <Text style={styles.heroSubtitle}>
            Advanced personal security technology. Proximity alerts, haptic
            triggers, and automated emergency response — engineered for the
            moments that matter.
          </Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaItem}>↓  Scroll to learn how it works</Text>
          </View>
        </View>

        {/* Trust strip */}
        <View style={styles.trustStrip}>
          <Text style={styles.trustItem}>END-TO-END ENCRYPTED</Text>
          <Text style={styles.trustItem}>SUB-SECOND TRIGGERS</Text>
          <Text style={styles.trustItem}>PRIVACY BY DESIGN</Text>
          <Text style={styles.trustItem}>VERIFIED RESPONDERS</Text>
        </View>

        {/* The problem */}
        <Section eyebrow="THE PROBLEM" title="Conventional emergency response is too slow." width={520}>
          <Text style={styles.body}>
            In India, the average emergency-call-to-on-scene-response time is
            measured in tens of minutes — not seconds. Most attackers act in
            under two minutes. By the time conventional response arrives,
            the moment that mattered is over.
          </Text>
          <Text style={[styles.body, { marginTop: 14 }]}>
            Proximate inverts the model: instead of waiting for one centralized
            authority to dispatch, it alerts everyone *physically closest* to
            the victim, in parallel — community first, police in lockstep.
          </Text>
        </Section>

        {/* How it works */}
        <Section eyebrow="HOW IT WORKS" title="Four phases. Every one of them runs in real time.">
          <View style={styles.steps}>
            {STEPS.map((s) => (
              <View key={s.n} style={styles.step}>
                <Text style={styles.stepNumber}>{s.n}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepText}>{s.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* Core features */}
        <Section eyebrow="CORE CAPABILITY" title="Engineered for the seconds that decide everything.">
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={f.icon} size={18} color="#fafafa" />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* The interface (mock phone) */}
        <Section eyebrow="THE INTERFACE" title={'A single tap.\nA trusted network.'}>
          <Text style={styles.body}>
            Quiet by default, decisive when needed. The interface stays out
            of the way until the moment it doesn\'t.
          </Text>
          <View style={styles.phoneWrap}>
            <View style={styles.phone}>
              <View style={styles.phoneNotch} />
              <Text style={styles.phoneEyebrow}>PROXIMATE</Text>
              <Text style={styles.phoneStatus}>Standby</Text>
              <View style={styles.phoneRingZone}>
                <View style={styles.phoneRing} />
                <View style={styles.phonePulse} />
                <View style={styles.phoneCore}>
                  <Ionicons name="pulse" size={18} color="#fafafa" />
                  <Text style={styles.phoneCoreLabel}>PROTECTED</Text>
                </View>
              </View>
              <View style={styles.phoneTrigger}>
                <Text style={styles.phoneTriggerText}>Trigger alert</Text>
              </View>
              <View style={styles.phoneMap}>
                <View style={styles.phoneMapPin} />
              </View>
              <Text style={styles.phoneListLabel}>TRUSTED CIRCLE</Text>
              {[
                { initial: 'A', name: 'Aanya R.', rel: 'Mother' },
                { initial: 'V', name: 'Vikram S.', rel: 'Father' },
                { initial: 'P', name: 'Priya N.', rel: 'Sister' },
              ].map((c) => (
                <View key={c.name} style={styles.phoneListRow}>
                  <View style={styles.phoneListAvatar}>
                    <Text style={styles.phoneListAvatarText}>{c.initial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.phoneListName}>{c.name}</Text>
                    <Text style={styles.phoneListRel}>{c.rel}</Text>
                  </View>
                  <Ionicons name="call-outline" size={12} color="#52525b" />
                </View>
              ))}
              <View style={styles.phoneHomeBar} />
            </View>
          </View>
        </Section>

        {/* Technology */}
        <Section eyebrow="TECHNOLOGY" title="The stack, made plain.">
          <View style={styles.techGrid}>
            {[
              { label: 'CLIENT', value: 'React Native (Expo) — same codebase across iOS, Android, and web' },
              { label: 'REAL-TIME', value: 'Socket.IO over WebSocket — sub-second incident broadcast' },
              { label: 'VIDEO', value: 'WebRTC peer connections with STUN — citizen → responder' },
              { label: 'LOCATION', value: 'expo-location with hard 1.5s timeout and fallback coordinate' },
              { label: 'MAP', value: 'Leaflet + OpenStreetMap (CARTO Dark) — no Google dependency' },
              { label: 'ROUTING', value: 'OSRM public demo for road-network ETA + driving distance' },
              { label: 'POLICE LOOKUP', value: 'Overpass API querying OSM amenity=police within 5km radius' },
              { label: 'BACKEND', value: 'Node.js + Express + Socket.IO — JWT auth, in-memory mock for demo' },
            ].map((t) => (
              <View key={t.label} style={styles.techCard}>
                <Text style={styles.techLabel}>{t.label}</Text>
                <Text style={styles.techValue}>{t.value}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Built for India */}
        <Section eyebrow="LOCALISATION" title="Built for India.">
          <View style={styles.langRow}>
            {['English', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'বাংলা'].map((l) => (
              <View key={l} style={styles.langChip}>
                <Text style={styles.langChipText}>{l}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.body, { marginTop: 20 }]}>
            Onboarding in five Indian languages with parallel translations. Map
            tiles, police-station data, and routing — all sourced from
            OpenStreetMap, so we never depend on Google's infrastructure
            (or pricing) to function in rural areas.
          </Text>
        </Section>

        {/* Final CTA */}
        <View style={styles.finalCta}>
          <Text style={styles.finalEyebrow}>READY?</Text>
          <Text style={styles.finalTitle}>Be among{'\n'}the first protected.</Text>
          <Text style={styles.finalSubtitle}>
            Verification takes about a minute. By continuing you agree to use
            Proximate only for genuine safety scenarios. Misuse is monitored
            and may be reported under applicable law.
          </Text>
          <Pressable
            onPress={goToQuiz}
            style={({ pressed }) => [styles.finalCtaBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.finalCtaText}>Create your account</Text>
            <Ionicons name="arrow-forward" size={18} color="#0a0a0a" />
          </Pressable>
          <Pressable onPress={goToLogin} style={({ pressed }) => [styles.finalSecondary, pressed && { opacity: 0.7 }]}>
            <Text style={styles.finalSecondaryText}>I already have an account</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <View style={styles.footerRow}>
            <View style={styles.navBrand}>
              <Ionicons name="shield-checkmark" size={14} color="#71717a" />
              <Text style={styles.footerBrand}>PROXIMATE — © 2026</Text>
            </View>
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>Privacy</Text>
              <Text style={styles.footerLink}>Terms</Text>
              <Text style={styles.footerLink}>Security</Text>
              <Text style={styles.footerLink}>Press</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  eyebrow,
  title,
  children,
  width,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={[styles.sectionTitle, width ? { maxWidth: width } : null]}>{title}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  scroll: { paddingBottom: 80 },

  /* Sticky nav */
  navWrap: {
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBrandText: {
    color: '#fafafa',
    fontSize: 12,
    letterSpacing: 2.5,
    fontWeight: '600',
  },
  navLinks: {
    flexDirection: 'row',
    gap: 28,
    flex: 1,
    justifyContent: 'center',
  },
  navLink: { color: '#a1a1aa', fontSize: 13 },
  navCtas: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navLoginBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  navLoginText: { color: '#a1a1aa', fontSize: 13, fontWeight: '500' },
  navCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  navCtaText: { color: '#0a0a0a', fontSize: 13, fontWeight: '600' },

  /* Hero */
  hero: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 56,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
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
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' },
  eyebrowText: { color: '#a1a1aa', fontSize: 9, letterSpacing: 2, fontWeight: '600' },
  heroTitle: {
    color: '#fafafa',
    fontSize: 80,
    fontWeight: '700',
    lineHeight: 82,
    letterSpacing: -3,
  },
  heroTitleMuted: { color: '#52525b' },
  heroSubtitle: {
    color: '#a1a1aa',
    fontSize: 16,
    lineHeight: 28,
    marginTop: 32,
    maxWidth: 520,
  },
  heroMeta: { marginTop: 48 },
  heroMetaItem: { color: '#52525b', fontSize: 12, letterSpacing: 1 },

  /* Trust strip */
  trustStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  trustItem: { color: '#52525b', fontSize: 10, letterSpacing: 2, fontWeight: '600' },

  /* Sections (reusable) */
  section: {
    paddingHorizontal: 24,
    paddingVertical: 64,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  sectionEyebrow: {
    color: '#52525b',
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '600',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#fafafa',
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -1,
    marginBottom: 24,
    maxWidth: 720,
  },
  body: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 26,
    maxWidth: 600,
  },

  /* Steps (how it works) */
  steps: { gap: 12, marginTop: 16 },
  step: {
    flexDirection: 'row',
    gap: 24,
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 16,
  },
  stepNumber: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    minWidth: 30,
  },
  stepTitle: { color: '#fafafa', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  stepText: { color: '#a1a1aa', fontSize: 13, lineHeight: 21 },

  /* Features */
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  featureCard: {
    flexBasis: 320,
    flexGrow: 1,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    padding: 24,
    borderRadius: 16,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { color: '#fafafa', fontSize: 15, fontWeight: '600', marginTop: 18 },
  featureText: { color: '#a1a1aa', fontSize: 12, lineHeight: 19, marginTop: 6 },

  /* Mock phone preview */
  phoneWrap: { alignItems: 'center', marginTop: 32 },
  phone: {
    width: 280,
    backgroundColor: '#09090b',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 18,
    paddingTop: 24,
    paddingBottom: 14,
  },
  phoneNotch: {
    alignSelf: 'center',
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272a',
    marginBottom: 18,
  },
  phoneEyebrow: { color: '#52525b', fontSize: 9, letterSpacing: 2, fontWeight: '600' },
  phoneStatus: { color: '#fafafa', fontSize: 20, fontWeight: '600', marginTop: 4, marginBottom: 24 },
  phoneRingZone: { alignItems: 'center', justifyContent: 'center', height: 130 },
  phoneRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: '#fafafa',
    opacity: 0.6,
  },
  phonePulse: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(250, 250, 250, 0.04)',
  },
  phoneCore: { alignItems: 'center' },
  phoneCoreLabel: { color: '#52525b', fontSize: 9, letterSpacing: 2, fontWeight: '600', marginTop: 6 },
  phoneTrigger: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#27272a',
    marginTop: 12,
  },
  phoneTriggerText: { color: '#a1a1aa', fontSize: 11, letterSpacing: 0.5 },
  phoneMap: {
    marginTop: 20,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneMapPin: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fafafa' },
  phoneListLabel: { color: '#52525b', fontSize: 9, letterSpacing: 2, fontWeight: '600', marginTop: 20, marginBottom: 12 },
  phoneListRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  phoneListAvatar: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    borderColor: '#27272a', backgroundColor: '#18181b',
    alignItems: 'center', justifyContent: 'center',
  },
  phoneListAvatarText: { color: '#a1a1aa', fontSize: 11, fontWeight: '600' },
  phoneListName: { color: '#fafafa', fontSize: 12 },
  phoneListRel: { color: '#52525b', fontSize: 10, marginTop: 1 },
  phoneHomeBar: {
    alignSelf: 'center', width: 80, height: 3, borderRadius: 2,
    backgroundColor: '#27272a', marginTop: 14,
  },

  /* Tech grid */
  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  techCard: {
    flexBasis: 280,
    flexGrow: 1,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    padding: 18,
    borderRadius: 14,
  },
  techLabel: { color: '#52525b', fontSize: 10, letterSpacing: 2, fontWeight: '600', marginBottom: 8 },
  techValue: { color: '#fafafa', fontSize: 13, lineHeight: 20 },

  /* Languages */
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  langChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
  },
  langChipText: { color: '#fafafa', fontSize: 15 },

  /* Final CTA */
  finalCta: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  finalEyebrow: { color: '#52525b', fontSize: 10, letterSpacing: 2.2, fontWeight: '600', marginBottom: 16 },
  finalTitle: {
    color: '#fafafa',
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 60,
    letterSpacing: -2,
    textAlign: 'center',
  },
  finalSubtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 24,
    marginBottom: 36,
    textAlign: 'center',
    maxWidth: 520,
  },
  finalCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fbbf24',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 999,
  },
  finalCtaText: { color: '#0a0a0a', fontSize: 15, fontWeight: '600' },
  finalSecondary: { marginTop: 16, paddingVertical: 10 },
  finalSecondaryText: { color: '#71717a', fontSize: 13 },

  /* Footer */
  footer: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  footerLine: { height: 1, backgroundColor: '#27272a', marginTop: 40 },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 24,
    gap: 14,
  },
  footerBrand: { color: '#71717a', fontSize: 11, letterSpacing: 1.5 },
  footerLinks: { flexDirection: 'row', gap: 22 },
  footerLink: { color: '#52525b', fontSize: 12 },
});
