import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  stockQty: number;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  addItem: (product: any, userId: string, storeId: string) => Promise<boolean>;
  updateQty: (productId: string, delta: number, userId: string, storeId: string) => Promise<void>;
  removeItem: (productId: string, userId: string, storeId: string) => Promise<void>;
  clearCart: () => void;
}

const syncToDb = async (userId: string, storeId: string, items: CartItem[]) => {
  await supabase.from('carts').upsert({ user_id: userId, store_id: storeId, items });
};

const calculateStats = (items: CartItem[]) => ({
  items,
  itemCount: items.reduce((acc, item) => acc + item.qty, 0),
  totalPrice: items.reduce((acc, item) => acc + (item.price * item.qty), 0),
});

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  itemCount: 0,
  totalPrice: 0,

  addItem: async (product, userId, storeId) => {
    const currentItems = [...get().items];
    const existingIndex = currentItems.findIndex(i => i.productId === product.id);
    
    if (existingIndex >= 0) {
      if (currentItems[existingIndex].qty < currentItems[existingIndex].stockQty) {
        currentItems[existingIndex].qty += 1;
      } else {
        return false; // Out of stock limit
      }
    } else {
      currentItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        stockQty: product.stock_qty
      });
    }
    
    set(calculateStats(currentItems));
    await syncToDb(userId, storeId, currentItems);
    return true;
  },

  updateQty: async (productId, delta, userId, storeId) => {
    let currentItems = [...get().items];
    const index = currentItems.findIndex(i => i.productId === productId);
    
    if (index >= 0) {
      const newQty = currentItems[index].qty + delta;
      if (newQty <= 0) {
        currentItems = currentItems.filter(i => i.productId !== productId);
      } else if (newQty <= currentItems[index].stockQty) {
        currentItems[index].qty = newQty;
      }
    }
    
    set(calculateStats(currentItems));
    await syncToDb(userId, storeId, currentItems);
  },

  removeItem: async (productId, userId, storeId) => {
    const currentItems = get().items.filter(i => i.productId !== productId);
    set(calculateStats(currentItems));
    await syncToDb(userId, storeId, currentItems);
  },

  clearCart: () => set({ items: [], itemCount: 0, totalPrice: 0 })
}));