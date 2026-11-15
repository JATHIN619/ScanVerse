import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

interface CustomNote {
  id: string;
  text: string;
  isCompleted: boolean;
}

interface WishlistState {
  items: any[];
  customNotes: Record<string, CustomNote[]>;
  loading: boolean;
  fetchWishlist: (userId: string) => Promise<void>;
  toggleWishlist: (product: any, userId: string) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  addCustomNote: (storeId: string, text: string) => void;
  removeCustomNote: (storeId: string, noteId: string) => void;
  toggleNoteCompletion: (storeId: string, noteId: string) => void;
  editCustomNote: (storeId: string, noteId: string, newText: string) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      customNotes: {},
      loading: false,

      fetchWishlist: async (userId: string) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('wishlists')
            .select('product_id, products(*)')
            .eq('user_id', userId);

          if (error) throw error;
          
          const products = data ? data.map(d => d.products).filter(Boolean) : [];
          set({ items: products, loading: false });
        } catch (error) {
          console.error("Error fetching wishlist:", error);
          set({ loading: false });
        }
      },

      toggleWishlist: async (product, userId) => {
        const currentItems = get().items;
        const exists = currentItems.some(item => item.id === product.id);

        if (exists) {
          set({ items: currentItems.filter(item => item.id !== product.id) });
          const { error } = await supabase.from('wishlists').delete().match({ user_id: userId, product_id: product.id });
          if (error) console.error("Failed to remove from wishlist:", error);
          return false; 
        } else {
          set({ items: [...currentItems, product] });
          const { error } = await supabase.from('wishlists').insert({ user_id: userId, product_id: product.id });
          if (error) console.error("Failed to add to wishlist:", error);
          return true; 
        }
      },

      isInWishlist: (productId) => {
        return get().items.some(item => item.id === productId);
      },

      // FEATURE: Custom Text Notes with To-Do Logic
      addCustomNote: (storeId, text) => {
        const notes = get().customNotes[storeId] || [];
        const newNote = { id: Math.random().toString(36).substring(7), text, isCompleted: false };
        set({ customNotes: { ...get().customNotes, [storeId]: [...notes, newNote] } });
      },

      removeCustomNote: (storeId, noteId) => {
        const notes = get().customNotes[storeId] || [];
        set({ customNotes: { ...get().customNotes, [storeId]: notes.filter(n => n.id !== noteId) } });
      },

      toggleNoteCompletion: (storeId, noteId) => {
        const notes = get().customNotes[storeId] || [];
        const updatedNotes = notes.map(n => n.id === noteId ? { ...n, isCompleted: !n.isCompleted } : n);
        set({ customNotes: { ...get().customNotes, [storeId]: updatedNotes } });
      },

      editCustomNote: (storeId, noteId, newText) => {
        const notes = get().customNotes[storeId] || [];
        const updatedNotes = notes.map(n => n.id === noteId ? { ...n, text: newText } : n);
        set({ customNotes: { ...get().customNotes, [storeId]: updatedNotes } });
      }
    }),
    {
      name: 'wishlist-notes-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ customNotes: state.customNotes }),
    }
  )
);