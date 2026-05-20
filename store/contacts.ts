import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface ContactsState {
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id'>) => void;
  removeContact: (id: string) => void;
}

export const useContactsStore = create<ContactsState>()(
  persist(
    (set) => ({
      contacts: [],
      addContact: (contact) =>
        set((state) => ({
          contacts: [
            ...state.contacts,
            { ...contact, id: Date.now().toString() },
          ],
        })),
      removeContact: (id) =>
        set((state) => ({
          contacts: state.contacts.filter((c) => c.id !== id),
        })),
    }),
    {
      name: 'proximate-contacts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
