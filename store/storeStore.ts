import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StoreState {
  activeStore: any | null;
  setActiveStore: (store: any) => void;
  clearActiveStore: () => void;
}

export const useStoreStore = create<StoreState>()(
  persist(
    (set) => ({
      activeStore: null,
      setActiveStore: (store) => set({ activeStore: store }),
      clearActiveStore: () => set({ activeStore: null }),
    }),
    {
      name: 'store-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);