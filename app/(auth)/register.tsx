import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, Redirect } from 'expo-router';
import { registerUser } from '@/services/api';
import {
  useAuthStore,
  type BloodGroup,
  type EmergencyContact,
  type Gender,
  type UserRole,
} from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

const BLOOD_GROUPS: BloodGroup[] = [
  'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'unknown',
];

const ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: 'citizen', label: 'Citizen', hint: 'I want protection for myself' },
  { value: 'responder', label: 'Responder', hint: 'I help nearby users in trouble' },
  { value: 'police', label: 'Police', hint: 'I am a verified law-enforcement official' },
];

const EMPTY_CONTACT: EmergencyContact = { name: '', phone: '' };

export default function RegisterScreen() {
  const setUser = useAuthStore((s) => s.setUser);
  const quizPassed = useOnboardingStore((s) => s.quizPassed);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>('unspecified');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('unknown');
  const [role, setRole] = useState<UserRole>('citizen');
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { ...EMPTY_CONTACT },
    { ...EMPTY_CONTACT },
  ]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!quizPassed) return <Redirect href="/(auth)/quiz" />;

  function updateContact(idx: number, patch: Partial<EmergencyContact>) {
    setContacts((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !phone.trim() || !password) {
      setError('Name, phone, and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Email address looks invalid.');
      return;
    }
    const trimmedContacts = contacts
      .map((c) => ({ name: c.name.trim(), phone: c.phone.trim() }))
      .filter((c) => c.name || c.phone);
    for (const c of trimmedContacts) {
      if (!c.name || !c.phone) {
        setError('Each emergency contact needs both a name and a phone number.');
        return;
      }
    }

    setLoading(true);
    try {
      const user = await registerUser({
        name: name.trim(),
        phone: phone.trim(),
        password,
        email: email.trim() || undefined,
        gender,
        bloodGroup,
        role,
        emergencyContacts: trimmedContacts,
      });
      setUser(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>Proximate</Text>
        <Text style={styles.tagline}>Create your safety profile</Text>

        {/* Identity */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Identity</Text>

          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nithillakrishi PY"
            placeholderTextColor="#4B5563"
            autoComplete="name"
          />

          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor="#4B5563"
            keyboardType="phone-pad"
            autoComplete="tel"
          />

          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#4B5563"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDERS.map((g) => {
              const selected = gender === g.value;
              return (
                <Pressable
                  key={g.value}
                  onPress={() => setGender(g.value)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Blood group</Text>
          <Text style={styles.helper}>Shared with the first verified responder, in case of injury.</Text>
          <View style={styles.chipRow}>
            {BLOOD_GROUPS.map((bg) => {
              const selected = bloodGroup === bg;
              return (
                <Pressable
                  key={bg}
                  onPress={() => setBloodGroup(bg)}
                  style={({ pressed }) => [
                    styles.chipSmall,
                    selected && styles.chipSelected,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {bg === 'unknown' ? "Don't know" : bg}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Role */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>I am a…</Text>
          <View style={styles.roleCol}>
            {ROLES.map((r) => {
              const selected = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRole(r.value)}
                  style={({ pressed }) => [
                    styles.roleCard,
                    selected && styles.roleCardSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.roleHead}>
                    <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>
                      {r.label}
                    </Text>
                    {selected ? <View style={styles.roleDot} /> : null}
                  </View>
                  <Text style={styles.roleHint}>{r.hint}</Text>
                </Pressable>
              );
            })}
          </View>
          {role === 'police' ? (
            <Text style={styles.helper}>
              Police accounts are marked unverified until manually approved by an
              admin. Your dashboard will work; the verified badge appears after review.
            </Text>
          ) : null}
        </View>

        {/* Emergency contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Emergency contacts</Text>
          <Text style={styles.helper}>
            Two trusted people notified the moment you trigger SOS. You can leave
            these blank and add them later.
          </Text>
          {contacts.map((c, i) => (
            <View key={i} style={styles.contactCard}>
              <Text style={styles.contactBadge}>CONTACT {i + 1}</Text>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={c.name}
                onChangeText={(v) => updateContact(i, { name: v })}
                placeholder="Mother"
                placeholderTextColor="#4B5563"
              />
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={c.phone}
                onChangeText={(v) => updateContact(i, { phone: v })}
                placeholder="+91 98765 43210"
                placeholderTextColor="#4B5563"
                keyboardType="phone-pad"
              />
            </View>
          ))}
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Security</Text>

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#4B5563"
            secureTextEntry
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            placeholderTextColor="#4B5563"
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.btnText}>Create account</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 60,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    color: '#fafafa',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#71717a',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },

  /* Sections */
  section: {
    backgroundColor: '#0f0f12',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f1f23',
    padding: 20,
    marginTop: 16,
  },
  sectionHeading: {
    color: '#fafafa',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 4,
  },

  /* Inputs */
  label: {
    color: '#71717a',
    fontSize: 11,
    marginBottom: 6,
    marginTop: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  helper: {
    color: '#52525b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#18181b',
    color: '#fafafa',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#27272a',
  },

  /* Chips (gender / blood group) */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
  },
  chipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
    minWidth: 52,
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
  },
  chipText: { color: '#a1a1aa', fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: '#fbbf24' },

  /* Role cards */
  roleCol: { gap: 10, marginTop: 12 },
  roleCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  roleCardSelected: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  roleHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleTitle: { color: '#fafafa', fontSize: 15, fontWeight: '600' },
  roleTitleSelected: { color: '#fbbf24' },
  roleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fbbf24' },
  roleHint: { color: '#71717a', fontSize: 12, marginTop: 4 },

  /* Emergency contact card */
  contactCard: {
    marginTop: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1f1f23',
  },
  contactBadge: {
    color: '#52525b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 14,
  },

  /* Submit */
  error: {
    color: '#f87171',
    fontSize: 13,
    marginTop: 18,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#fbbf24',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#0a0a0a', fontSize: 15, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: { color: '#71717a', fontSize: 14 },
  link: { color: '#fbbf24', fontSize: 14, fontWeight: '600' },
});
