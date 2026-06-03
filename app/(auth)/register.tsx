import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { registerUser, sendOtp, verifyOtp, type OtpChannel } from '@/services/api';
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
  { value: 'transgender_female', label: 'Transgender female' },
  { value: 'transgender_male', label: 'Transgender male' },
  { value: 'genderfluid', label: 'Genderfluid' },
  { value: 'genderqueer', label: 'Genderqueer' },
  { value: 'agender', label: 'Agender' },
  { value: 'intersex', label: 'Intersex' },
  { value: 'other', label: 'Prefer to self-describe' },
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

const MIN_CONTACTS = 1;
const MAX_CONTACTS = 5;

export default function RegisterScreen() {
  const setUser = useAuthStore((s) => s.setUser);
  const quizPassed = useOnboardingStore((s) => s.quizPassed);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [gender, setGender] = useState<Gender>('unspecified');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('unknown');
  const [role, setRole] = useState<UserRole>('citizen');
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { name: '', phone: '' },
  ]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!quizPassed) return <Redirect href="/(auth)/quiz" />;

  function updateContact(idx: number, patch: Partial<EmergencyContact>) {
    setContacts((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function addContact() {
    if (contacts.length >= MAX_CONTACTS) return;
    setContacts((cs) => [...cs, { name: '', phone: '' }]);
  }
  function removeContact(idx: number) {
    if (contacts.length <= MIN_CONTACTS) return;
    setContacts((cs) => cs.filter((_, i) => i !== idx));
  }

  // Editing a verified phone/email invalidates the previous verification so
  // the user can't sneak through with a verified-then-changed value.
  function changePhone(v: string) {
    setPhone(v);
    if (phoneVerified) setPhoneVerified(false);
  }
  function changeEmail(v: string) {
    setEmail(v);
    if (emailVerified) setEmailVerified(false);
  }

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !phone.trim() || !password) {
      setError('Name, phone, and password are required.');
      return;
    }
    if (!phoneVerified) {
      setError('Please verify your phone number with the OTP first.');
      return;
    }
    if (email && !emailVerified) {
      setError('Please verify your email or remove it.');
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
    if (trimmedContacts.length < MIN_CONTACTS) {
      setError('Add at least one emergency contact.');
      return;
    }
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
            style={[styles.input, phoneVerified && styles.inputVerified]}
            value={phone}
            onChangeText={changePhone}
            placeholder="+91 98765 43210"
            placeholderTextColor="#4B5563"
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={!phoneVerified}
          />
          <OtpField
            channel="sms"
            target={phone}
            verified={phoneVerified}
            onVerified={() => setPhoneVerified(true)}
          />

          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={[styles.input, emailVerified && styles.inputVerified]}
            value={email}
            onChangeText={changeEmail}
            placeholder="you@example.com"
            placeholderTextColor="#4B5563"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!emailVerified}
          />
          {email.length > 0 ? (
            <OtpField
              channel="email"
              target={email}
              verified={emailVerified}
              onVerified={() => setEmailVerified(true)}
            />
          ) : null}

          <Text style={styles.label}>Gender</Text>
          <GenderSelect value={gender} onChange={setGender} />

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
          <Text style={styles.sectionHeading}>
            Emergency contacts ({contacts.length}/{MAX_CONTACTS})
          </Text>
          <Text style={styles.helper}>
            At least one is required — these people are notified the instant you
            trigger SOS. You can add up to {MAX_CONTACTS}.
          </Text>
          {contacts.map((c, i) => (
            <View key={i} style={styles.contactCard}>
              <View style={styles.contactHead}>
                <Text style={styles.contactBadge}>CONTACT {i + 1}</Text>
                {contacts.length > MIN_CONTACTS ? (
                  <Pressable
                    onPress={() => removeContact(i)}
                    style={({ pressed }) => [styles.contactRemove, pressed && { opacity: 0.6 }]}
                  >
                    <Ionicons name="close" size={14} color="#a1a1aa" />
                    <Text style={styles.contactRemoveText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
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
          {contacts.length < MAX_CONTACTS ? (
            <Pressable
              onPress={addContact}
              style={({ pressed }) => [styles.addContactBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="add" size={16} color="#fbbf24" />
              <Text style={styles.addContactText}>Add another contact</Text>
            </Pressable>
          ) : (
            <Text style={[styles.helper, { marginTop: 12 }]}>
              You've added the maximum {MAX_CONTACTS} contacts.
            </Text>
          )}
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

/* ── OTP field ────────────────────────────────────────────────────────────── */
function OtpField({
  channel,
  target,
  verified,
  onVerified,
}: {
  channel: OtpChannel;
  target: string;
  verified: boolean;
  onVerified: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Reset local state if the parent edits the target after we've sent.
  if (sent && !verified && !target.trim()) {
    setSent(false);
    setCode('');
  }

  async function send() {
    if (!target.trim()) return;
    setErr('');
    setBusy(true);
    try {
      await sendOtp(channel, target.trim());
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (code.length < 6) return;
    setErr('');
    setBusy(true);
    try {
      await verifyOtp(channel, target.trim(), code);
      onVerified();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  if (verified) {
    return (
      <View style={styles.otpVerifiedRow}>
        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
        <Text style={styles.otpVerifiedText}>Verified</Text>
      </View>
    );
  }

  if (!sent) {
    const disabled = !target.trim() || busy;
    return (
      <View style={{ marginTop: 8 }}>
        <Pressable
          onPress={send}
          disabled={disabled}
          style={({ pressed }) => [
            styles.otpBtn,
            disabled && styles.otpBtnDisabled,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons
            name={channel === 'sms' ? 'phone-portrait-outline' : 'mail-outline'}
            size={14}
            color={disabled ? '#52525b' : '#fbbf24'}
          />
          <Text style={[styles.otpBtnText, disabled && { color: '#52525b' }]}>
            {busy ? 'Sending…' : `Send ${channel === 'sms' ? 'SMS' : 'email'} OTP`}
          </Text>
        </Pressable>
        {err ? <Text style={styles.otpErr}>{err}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8 }}>
      <View style={styles.otpRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={code}
          onChangeText={setCode}
          placeholder="6-digit code"
          placeholderTextColor="#4B5563"
          keyboardType="number-pad"
          maxLength={6}
        />
        <Pressable
          onPress={verify}
          disabled={code.length < 6 || busy}
          style={({ pressed }) => [
            styles.otpVerifyBtn,
            (code.length < 6 || busy) && styles.otpBtnDisabled,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.otpVerifyText}>{busy ? '…' : 'Verify'}</Text>
        </Pressable>
      </View>
      <View style={styles.otpFooter}>
        <Text style={styles.otpHint}>Dev: use 123456</Text>
        <Pressable onPress={send} disabled={busy} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.otpResend}>Resend</Text>
        </Pressable>
      </View>
      {err ? <Text style={styles.otpErr}>{err}</Text> : null}
    </View>
  );
}

/* ── Gender dropdown ──────────────────────────────────────────────────────── */
function GenderSelect({ value, onChange }: { value: Gender; onChange: (g: Gender) => void }) {
  const [open, setOpen] = useState(false);
  const current = GENDERS.find((g) => g.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.selectBtn, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.selectText}>{current?.label ?? 'Select…'}</Text>
        <Ionicons name="chevron-down" size={16} color="#71717a" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalHeading}>Gender</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {GENDERS.map((g) => {
                const selected = value === g.value;
                return (
                  <Pressable
                    key={g.value}
                    onPress={() => {
                      onChange(g.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.modalOption,
                      selected && styles.modalOptionSelected,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.modalOptionText, selected && styles.modalOptionTextSelected]}>
                      {g.label}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={18} color="#fbbf24" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
  inputVerified: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    color: '#a1a1aa',
  },

  /* OTP field */
  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  otpBtnDisabled: {
    borderColor: '#27272a',
    backgroundColor: '#18181b',
  },
  otpBtnText: { color: '#fbbf24', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  otpRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  otpVerifyBtn: {
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
  },
  otpVerifyText: { color: '#0a0a0a', fontSize: 13, fontWeight: '700' },
  otpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  otpHint: { color: '#52525b', fontSize: 11, letterSpacing: 0.5 },
  otpResend: { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
  otpErr: { color: '#f87171', fontSize: 12, marginTop: 6 },
  otpVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  otpVerifiedText: { color: '#22c55e', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  /* Gender dropdown */
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  selectText: { color: '#fafafa', fontSize: 15 },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f0f12',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  modalHeading: {
    color: '#fafafa',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalOptionSelected: { backgroundColor: 'rgba(251, 191, 36, 0.08)' },
  modalOptionText: { color: '#e4e4e7', fontSize: 14 },
  modalOptionTextSelected: { color: '#fbbf24', fontWeight: '600' },

  /* Chips (blood group only — gender is now a dropdown) */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  contactHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  contactBadge: {
    color: '#52525b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  contactRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  contactRemoveText: { color: '#a1a1aa', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    backgroundColor: 'rgba(251, 191, 36, 0.04)',
  },
  addContactText: { color: '#fbbf24', fontSize: 13, fontWeight: '600' },

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
