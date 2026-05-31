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
    accent: '500m → 1km → 2km',
  },
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Hold · Shake · Volume',
    text: 'Three discreet triggers, designed for the moments you can\'t look at your screen or unlock your phone.',
    accent: '3 trigger methods',
  },
  {
    icon: 'people-outline' as const,
    title: 'Community + Police',
    text: 'Trusted contacts, nearby verified users, and the nearest police station — all alerted in parallel, not sequentially.',
    accent: 'parallel dispatch',
  },
  {
    icon: 'videocam-outline' as const,
    title: 'Live Video & Forensic Trail',
    text: 'Optional live camera stream to responders. Every incident produces an encrypted, timestamped audit log for evidence.',
    accent: 'WebRTC + audit log',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Community Verification',
    text: 'A misuse-resistant network. Verified users vouch for genuine threats; false-alarm flags suppress bad actors before escalation.',
    accent: 'false-alarm filter',
  },
  {
    icon: 'language-outline' as const,
    title: 'Built for India',
    text: 'Onboarding in 5 languages, real OpenStreetMap police-station lookup, and 1.5s GPS timeouts that survive weak rural networks.',
    accent: '5 languages',
  },
];

const STEPS = [
  {
    n: '01',
    icon: 'flash-outline' as const,
    title: 'Trigger in any state',
    text: 'Long-press the SOS button, shake the phone three times, or triple-press the volume key. Designed for panic.',
  },
  {
    n: '02',
    icon: 'radio-outline' as const,
    title: 'Alert the proximity network',
    text: 'Within seconds, nearby Proximate users, your trusted contacts, and the nearest police station get notified.',
  },
  {
    n: '03',
    icon: 'expand-outline' as const,
    title: 'Escalate if response is slow',
    text: 'After 60 seconds the radius doubles to 1km. After another 60, it becomes 2km with police priority.',
  },
  {
    n: '04',
    icon: 'navigate-outline' as const,
    title: 'Reassurance in real time',
    text: 'The moment a responder acknowledges, you see their name, distance, and ETA. As they move, the ETA updates live.',
  },
];

const STACK = [
  { label: 'CLIENT', value: 'React Native · Expo · same code on iOS, Android, web' },
  { label: 'REAL-TIME', value: 'Socket.IO over WebSocket · sub-second broadcast' },
  { label: 'VIDEO', value: 'WebRTC peer connections with public STUN' },
  { label: 'LOCATION', value: 'expo-location · 1.5s timeout · fallback coordinate' },
  { label: 'MAP', value: 'Leaflet · OpenStreetMap CARTO Dark · no Google dependency' },
  { label: 'ROUTING', value: 'OSRM road-network ETA + driving distance' },
  { label: 'POLICE LOOKUP', value: 'Overpass API querying OSM amenity=police' },
  { label: 'BACKEND', value: 'Node.js · Express · Socket.IO · JWT auth' },
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

        {/* HERO — 2-column: text left, phone preview right */}
        <View style={styles.hero}>
          <View style={styles.heroText}>
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
            <Text style={styles.heroScrollHint}>↓  Scroll to see how it works</Text>
          </View>

          {/* Hero preview: layered mock phone with subtle glow */}
          <View style={styles.heroPreview}>
            <View style={styles.heroPreviewGlow} />
            <MockPhone />
          </View>
        </View>

        {/* Trust strip */}
        <View style={styles.trustStrip}>
          {['END-TO-END ENCRYPTED', 'SUB-SECOND TRIGGERS', 'PRIVACY BY DESIGN', 'VERIFIED RESPONDERS', '5 LANGUAGES'].map((t) => (
            <Text key={t} style={styles.trustItem}>{t}</Text>
          ))}
        </View>

        {/* THE PROBLEM — 2-col: text left, stat card right */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionCol}>
            <Text style={styles.sectionEyebrow}>THE PROBLEM</Text>
            <Text style={styles.sectionTitle}>Conventional emergency response is too slow.</Text>
            <Text style={styles.body}>
              In India, the average emergency-call-to-on-scene-response time is
              measured in tens of minutes — not seconds. Most attackers act in
              under two minutes. By the time conventional response arrives,
              the moment that mattered is over.
            </Text>
            <Text style={[styles.body, { marginTop: 16 }]}>
              Proximate inverts the model: instead of waiting for one
              centralized authority to dispatch, it alerts everyone
              <Text style={{ color: '#fafafa', fontWeight: '600' }}> physically closest</Text>
              {' '}to the victim, in parallel — community first, police in lockstep.
            </Text>
          </View>

          <View style={styles.sectionCol}>
            <View style={styles.statCard}>
              <Text style={styles.statEyebrow}>RESPONSE-TIME GAP</Text>
              <View style={styles.statRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statNumber}>10+ min</Text>
                  <Text style={styles.statLabel}>Conventional response</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <Text style={[styles.statNumber, { color: '#fbbf24' }]}>&lt;2 min</Text>
                  <Text style={styles.statLabel}>Attacker window</Text>
                </View>
              </View>
              <View style={styles.statBarTrack}>
                <View style={styles.statBarFill} />
              </View>
              <Text style={styles.statBarCaption}>
                The gap Proximate closes — with the people already nearby.
              </Text>
            </View>
          </View>
        </View>

        {/* HOW IT WORKS — 2×2 grid */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Four phases. Every one of them runs in real time.</Text>
          <View style={styles.stepGrid}>
            {STEPS.map((s) => (
              <View key={s.n} style={styles.stepCard}>
                <View style={styles.stepHead}>
                  <Text style={styles.stepNumber}>{s.n}</Text>
                  <View style={styles.stepIconWrap}>
                    <Ionicons name={s.icon} size={18} color="#fbbf24" />
                  </View>
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CORE CAPABILITY — feature grid */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>CORE CAPABILITY</Text>
          <Text style={styles.sectionTitle}>Engineered for the seconds that decide everything.</Text>
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <View style={styles.featureHead}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon} size={18} color="#fafafa" />
                  </View>
                  <Text style={styles.featureAccent}>{f.accent}</Text>
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* THE INTERFACE — 2-col: copy left, second mock phone right */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionCol}>
            <Text style={styles.sectionEyebrow}>THE INTERFACE</Text>
            <Text style={styles.sectionTitle}>A single tap.{'\n'}A trusted network.</Text>
            <Text style={styles.body}>
              Quiet by default, decisive when needed. The interface stays out
              of the way until the moment it doesn\'t. Three triggers,
              one trusted circle, and a live link to the responder network.
            </Text>
            <View style={styles.bulletRow}>
              {[
                'Live status ring shows protection state at a glance',
                'Encrypted end-to-end location sharing on demand',
                'Trusted contacts see verified, accurate context',
                'Cancellation requires biometric — to defeat coercion',
              ].map((b) => (
                <View key={b} style={styles.bullet}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.sectionCol}>
            <View style={styles.heroPreview}>
              <View style={styles.heroPreviewGlow} />
              <MockPhone />
            </View>
          </View>
        </View>

        {/* TECHNOLOGY — 4-col compact stack grid */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>TECHNOLOGY</Text>
          <Text style={styles.sectionTitle}>The stack, made plain.</Text>
          <Text style={[styles.body, { marginBottom: 28 }]}>
            Built on open standards — no proprietary lock-in. Every layer
            chosen to keep the system fast, auditable, and operational
            without depending on Google's infrastructure.
          </Text>
          <View style={styles.techGrid}>
            {STACK.map((t) => (
              <View key={t.label} style={styles.techCard}>
                <Text style={styles.techLabel}>{t.label}</Text>
                <Text style={styles.techValue}>{t.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* LOCALISATION — chips */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>LOCALISATION</Text>
          <Text style={styles.sectionTitle}>Built for India.</Text>
          <View style={styles.langRow}>
            {[
              { native: 'English', label: 'EN' },
              { native: 'हिन्दी', label: 'HI' },
              { native: 'தமிழ்', label: 'TA' },
              { native: 'తెలుగు', label: 'TE' },
              { native: 'বাংলা', label: 'BN' },
            ].map((l) => (
              <View key={l.label} style={styles.langCard}>
                <Text style={styles.langCardNative}>{l.native}</Text>
                <Text style={styles.langCardLabel}>{l.label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.body, { marginTop: 24 }]}>
            Onboarding and the safety quiz translated parallel across all five
            languages. Map tiles, police-station data, and routing — all
            sourced from OpenStreetMap, so the system functions in rural
            areas where Google services are slow or unavailable.
          </Text>
        </View>

        {/* FINAL CTA */}
        <View style={styles.finalCta}>
          <Text style={styles.finalEyebrow}>READY?</Text>
          <Text style={styles.finalTitle}>Be among{'\n'}the first protected.</Text>
          <Text style={styles.finalSubtitle}>
            Verification takes about a minute. By continuing you agree to use
            Proximate only for genuine safety scenarios. Misuse is monitored
            and may be reported under applicable law.
          </Text>
          <Pressable onPress={goToQuiz} style={({ pressed }) => [styles.finalCtaBtn, pressed && { opacity: 0.85 }]}>
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
              <Text style={styles.footerBrand}>PROXIMATE  —  © 2026</Text>
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

function MockPhone() {
  return (
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
        <View style={styles.phoneMapGrid} />
        <View style={styles.phoneMapPin} />
      </View>
      <View style={styles.phoneListHead}>
        <Text style={styles.phoneListLabel}>TRUSTED CIRCLE</Text>
        <Text style={styles.phoneListCount}>3 active</Text>
      </View>
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
    paddingHorizontal: 32,
    paddingVertical: 14,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBrandText: { color: '#fafafa', fontSize: 12, letterSpacing: 2.5, fontWeight: '600' },
  navLinks: { flexDirection: 'row', gap: 28, flex: 1, justifyContent: 'center' },
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

  /* HERO (2-col) */
  hero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 48,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 80,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroText: { flexBasis: 540, flexGrow: 1 },
  heroPreview: {
    flexBasis: 320,
    flexGrow: 1,
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 12,
  },
  heroPreviewGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    top: '50%',
    marginTop: -180,
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
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 74,
    letterSpacing: -3,
  },
  heroTitleMuted: { color: '#52525b' },
  heroSubtitle: {
    color: '#a1a1aa',
    fontSize: 16,
    lineHeight: 28,
    marginTop: 28,
    maxWidth: 480,
  },
  heroScrollHint: { color: '#52525b', fontSize: 12, letterSpacing: 1, marginTop: 36 },

  /* Trust strip */
  trustStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 28,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  trustItem: { color: '#52525b', fontSize: 10, letterSpacing: 2, fontWeight: '600' },

  /* Section (single-col) */
  section: {
    paddingHorizontal: 32,
    paddingVertical: 80,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },

  /* Section row (2-col) */
  sectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 56,
    paddingHorizontal: 32,
    paddingVertical: 80,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  sectionCol: { flexBasis: 400, flexGrow: 1, flexShrink: 1 },

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
    maxWidth: 600,
  },
  body: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 26,
    maxWidth: 600,
  },

  /* Stat card (problem section) */
  statCard: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
  },
  statEyebrow: {
    color: '#52525b',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 24,
  },
  statRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 24 },
  statBlock: { flex: 1 },
  statDivider: { width: 1, height: 60, backgroundColor: '#27272a', marginHorizontal: 16 },
  statNumber: { color: '#fafafa', fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  statLabel: { color: '#71717a', fontSize: 11, marginTop: 6, letterSpacing: 0.5 },
  statBarTrack: {
    height: 6,
    backgroundColor: '#27272a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  statBarFill: {
    height: '100%',
    width: '18%',
    backgroundColor: '#fbbf24',
    borderRadius: 3,
  },
  statBarCaption: { color: '#71717a', fontSize: 12, lineHeight: 18 },

  /* How it works grid */
  stepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  stepCard: {
    flexBasis: 360,
    flexGrow: 1,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
  },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stepNumber: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { color: '#fafafa', fontSize: 18, fontWeight: '600', marginBottom: 10 },
  stepText: { color: '#a1a1aa', fontSize: 13, lineHeight: 22 },

  /* Features */
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  featureCard: {
    flexBasis: 360,
    flexGrow: 1,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    padding: 28,
    borderRadius: 20,
  },
  featureHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  featureAccent: {
    color: '#fbbf24',
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  featureTitle: { color: '#fafafa', fontSize: 17, fontWeight: '600', marginBottom: 8 },
  featureText: { color: '#a1a1aa', fontSize: 13, lineHeight: 21 },

  /* Bullets for interface section */
  bulletRow: { marginTop: 28, gap: 14 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fbbf24',
    marginTop: 9,
  },
  bulletText: { color: '#d4d4d8', fontSize: 14, lineHeight: 22, flex: 1 },

  /* Mock phone */
  phone: {
    width: 300,
    backgroundColor: '#09090b',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 18,
    paddingTop: 26,
    paddingBottom: 14,
  },
  phoneNotch: {
    alignSelf: 'center',
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272a',
    marginBottom: 20,
  },
  phoneEyebrow: { color: '#52525b', fontSize: 9, letterSpacing: 2, fontWeight: '600' },
  phoneStatus: { color: '#fafafa', fontSize: 22, fontWeight: '600', marginTop: 4, marginBottom: 24 },
  phoneRingZone: { alignItems: 'center', justifyContent: 'center', height: 140 },
  phoneRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#fafafa',
    opacity: 0.7,
  },
  phonePulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
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
    height: 90,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  phoneMapGrid: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'transparent',
  },
  phoneMapPin: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fafafa' },
  phoneListHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  phoneListLabel: { color: '#52525b', fontSize: 9, letterSpacing: 2, fontWeight: '600' },
  phoneListCount: { color: '#52525b', fontSize: 9, letterSpacing: 1 },
  phoneListRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
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
  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  techCard: {
    flexBasis: 280,
    flexGrow: 1,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    padding: 20,
    borderRadius: 16,
  },
  techLabel: { color: '#fbbf24', fontSize: 10, letterSpacing: 2, fontWeight: '600', marginBottom: 10 },
  techValue: { color: '#fafafa', fontSize: 13, lineHeight: 20 },

  /* Language cards */
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  langCard: {
    flexBasis: 180,
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langCardNative: { color: '#fafafa', fontSize: 18, fontWeight: '600' },
  langCardLabel: { color: '#52525b', fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },

  /* Final CTA */
  finalCta: {
    paddingHorizontal: 32,
    paddingTop: 96,
    paddingBottom: 60,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  finalEyebrow: { color: '#52525b', fontSize: 10, letterSpacing: 2.2, fontWeight: '600', marginBottom: 18 },
  finalTitle: {
    color: '#fafafa',
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 68,
    letterSpacing: -2,
    textAlign: 'center',
  },
  finalSubtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 28,
    marginBottom: 36,
    textAlign: 'center',
    maxWidth: 540,
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
  footer: { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 },
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
