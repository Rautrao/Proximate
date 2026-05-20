import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useContactsStore, Contact } from '@/store/contacts';

function ContactRow({ contact, onRemove }: { contact: Contact; onRemove: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{contact.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{contact.name}</Text>
        <Text style={styles.rowMeta}>
          {contact.phone} · {contact.relation}
        </Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={12}>
        <Ionicons name="trash-outline" size={20} color="#6B7280" />
      </Pressable>
    </View>
  );
}

export default function ContactsScreen() {
  const { contacts, addContact, removeContact } = useContactsStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) return;
    addContact({ name: name.trim(), phone: phone.trim(), relation: relation.trim() || 'Contact' });
    setName('');
    setPhone('');
    setRelation('');
    setAdding(false);
  };

  const handleRemove = (id: string, contactName: string) => {
    Alert.alert('Remove contact', `Remove ${contactName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeContact(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Emergency Contacts</Text>
          <Pressable onPress={() => setAdding(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#DC2626" />
          </Pressable>
        </View>
        <Text style={styles.sub}>
          These people receive an SMS + your live location when SOS is triggered.
        </Text>

        {adding && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#4B5563"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              placeholderTextColor="#4B5563"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Relation (e.g. Mother)"
              placeholderTextColor="#4B5563"
              value={relation}
              onChangeText={setRelation}
            />
            <View style={styles.formRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setAdding(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}

        <FlatList
          data={contacts}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ContactRow
              contact={item}
              onRemove={() => handleRemove(item.id, item.name)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color="#374151" />
              <Text style={styles.emptyText}>No emergency contacts yet</Text>
              <Text style={styles.emptySub}>Tap + to add someone</Text>
            </View>
          }
          contentContainerStyle={contacts.length === 0 ? styles.emptyContainer : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 6,
  },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: '800' },
  addBtn: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sub: { color: '#6B7280', fontSize: 12, marginBottom: 20, lineHeight: 18 },
  form: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  input: {
    backgroundColor: '#111827',
    color: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  formRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: '#9CA3AF', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#F9FAFB', fontSize: 18, fontWeight: '700' },
  rowInfo: { flex: 1 },
  rowName: { color: '#F9FAFB', fontSize: 15, fontWeight: '600' },
  rowMeta: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', gap: 8 },
  emptyText: { color: '#6B7280', fontSize: 15 },
  emptySub: { color: '#4B5563', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
});
