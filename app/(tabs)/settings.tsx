import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { disconnectSocket } from '@/services/socket';

function Row({
  icon,
  label,
  value,
  onPress,
  right,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      disabled={!onPress && !right}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color="#9CA3AF" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right}
      {onPress && !right ? (
        <Ionicons name="chevron-forward" size={16} color="#4B5563" />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          disconnectSocket();
          logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
          </View>
        </View>

        {/* Alert preferences */}
        <Text style={styles.sectionLabel}>Alert Preferences</Text>
        <View style={styles.section}>
          <Row
            icon="navigate-outline"
            label="Starting radius"
            value="500m"
          />
          <Row
            icon="timer-outline"
            label="Escalation timeout"
            value="60 seconds"
          />
          <Row
            icon="phone-portrait-outline"
            label="Shake sensitivity"
            value="Medium"
          />
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.section}>
          <Row
            icon="notifications-outline"
            label="Push notifications"
            right={<Switch value={true} onValueChange={() => {}} thumbColor="#fbbf24" trackColor={{ true: '#854D0E', false: '#27272a' }} />}
          />
          <Row
            icon="mail-outline"
            label="Email alerts"
            right={<Switch value={false} onValueChange={() => {}} thumbColor="#fbbf24" trackColor={{ true: '#854D0E', false: '#27272a' }} />}
          />
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.section}>
          <Row icon="shield-outline" label="Privacy policy" onPress={() => {}} />
          <Row icon="document-text-outline" label="Terms of service" onPress={() => {}} />
          <Row icon="information-circle-outline" label="App version" value="1.0.0" />
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#F87171" />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { color: '#fafafa', fontSize: 22, fontWeight: '700', paddingTop: 20, marginBottom: 24, letterSpacing: -0.3 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#0a0a0a', fontSize: 17, fontWeight: '700' },
  userName: { color: '#fafafa', fontSize: 15, fontWeight: '600' },
  userPhone: { color: '#71717a', fontSize: 12, marginTop: 2 },
  sectionLabel: { color: '#52525b', fontSize: 10, fontWeight: '600', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' },
  section: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  rowPressed: { backgroundColor: '#27272a' },
  rowIcon: { width: 22, alignItems: 'center' },
  rowLabel: { flex: 1, color: '#fafafa', fontSize: 14 },
  rowValue: { color: '#71717a', fontSize: 12 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#18181b',
    borderRadius: 999,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  logoutBtnPressed: { backgroundColor: '#27272a' },
  logoutText: { color: '#f87171', fontSize: 14, fontWeight: '600' },
});
