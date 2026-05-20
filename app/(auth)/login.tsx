import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { loginUser } from '@/services/api';
import { useAuthStore } from '@/store/auth';

export default function LoginScreen() {
  const setUser = useAuthStore((s) => s.setUser);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(phone, password);
      setUser(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.logo}>Proximate</Text>
        <Text style={styles.tagline}>Your proximity safety network</Text>

        <View style={styles.form}>
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

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#4B5563"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <Link href="/(auth)/register" style={styles.link}>
              Create account
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logo: {
    color: '#F9FAFB',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 48,
  },
  form: { gap: 6 },
  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 4, marginTop: 14 },
  input: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  error: {
    color: '#F87171',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  btnPressed: { backgroundColor: '#B91C1C' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: { color: '#6B7280', fontSize: 14 },
  link: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
});
