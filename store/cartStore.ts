import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { trackProductEvent } from '../services/analytics';

export interface CartItem { productId: string; name: string; price: number; qty: number; stockQty: number; }

interface CartState {
  items: CartItem[];
  activePromotions: any[];
  itemCount: number;
  totalPrice: number;
  fetchPromotions: (storeId: string) => Promise<void>;
  addItem: (product: any, userId: string, storeId: string) => Promise<boolean>;
  updateQty: (productId: string, delta: number, userId: string, storeId: string) => Promise<void>;
  removeItem: (productId: string, userId: string, storeId: string) => Promise<void>;
  checkoutCart: (userId: string, storeId: string) => Promise<void>;
  clearCart: () => void;
}

const syncToDb = async (userId: string, storeId: string, items: CartItem[]) => {
  await supabase.from('carts').upsert({ user_id: userId, store_id: storeId, items });
};

// ADVANCED N-ITEM KNAPSACK MATH
const calculateStats = (items: CartItem[], promotions: any[] = []) => {
  let baseTotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  let totalDiscount = 0;

  promotions.forEach(promo => {
    const requiredItems = promo.required_items || [];
    if (requiredItems.length === 0) return;

    let possibleBundles = Infinity;
    let bundleBasePrice = 0;

    // Check if the cart has enough of EVERY required item to form a bundle
    for (const req of requiredItems) {
      const cartItem = items.find(i => i.name === req.name);
      if (!cartItem) { possibleBundles = 0; break; }
      
      const bundlesFromThisItem = Math.floor(cartItem.qty / req.qty);
      if (bundlesFromThisItem < possibleBundles) possibleBundles = bundlesFromThisItem;
      
      bundleBasePrice += (cartItem.price * req.qty);
    }

    if (possibleBundles > 0) {
      let discountPerBundle = 0;
      if (promo.discount_type === 'percentage') {
        discountPerBundle = bundleBasePrice * (promo.discount_value / 100);
      } else if (promo.discount_type === 'fixed_price') {
        discountPerBundle = bundleBasePrice - promo.discount_value;
      }
      if (discountPerBundle > 0) totalDiscount += (discountPerBundle * possibleBundles);
    }
  });

  return {
    items,
    itemCount: items.reduce((acc, item) => acc + item.qty, 0),
    totalPrice: Math.max(0, baseTotal - totalDiscount)
  };
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [], activePromotions: [], itemCount: 0, totalPrice: 0,

  fetchPromotions: async (storeId: string) => {
    try {
      const { data } = await supabase.from('store_promotions').select('*').eq('store_id', storeId);
      if (data) {
        set({ activePromotions: data });
        set(calculateStats(get().items, data));
      }
    } catch (err) { console.error(err); }
  },

  addItem: async (product, userId, storeId) => {
    if (product.stock_qty <= 0) return false;
    const currentItems = [...get().items];
    const existingIndex = currentItems.findIndex(i => i.productId === product.id);
    
    if (existingIndex >= 0) {
      if (currentItems[existingIndex].qty < currentItems[existingIndex].stockQty) currentItems[existingIndex].qty += 1;
      else return false; 
    } else {
      currentItems.push({ productId: product.id, name: product.name, price: product.price, qty: 1, stockQty: product.stock_qty });
    }
    
    set(calculateStats(currentItems, get().activePromotions));
    await syncToDb(userId, storeId, currentItems);
    trackProductEvent(product.id, storeId, 'scanned', product.price);
    return true;
  },

  updateQty: async (productId, delta, userId, storeId) => {
    let currentItems = [...get().items];
    const index = currentItems.findIndex(i => i.productId === productId);
    if (index >= 0) {
      const itemPrice = currentItems[index].price;
      const newQty = currentItems[index].qty + delta;
      if (newQty <= 0) currentItems = currentItems.filter(i => i.productId !== productId);
      else if (newQty <= currentItems[index].stockQty) currentItems[index].qty = newQty;

      if (delta > 0) trackProductEvent(productId, storeId, 'scanned', itemPrice);
      else if (delta < 0) trackProductEvent(productId, storeId, 'removed', itemPrice);
    }
    set(calculateStats(currentItems, get().activePromotions));
    await syncToDb(userId, storeId, currentItems);
  },

  removeItem: async (productId, userId, storeId) => {
    const itemToRemove = get().items.find(i => i.productId === productId);
    const currentItems = get().items.filter(i => i.productId !== productId);
    set(calculateStats(currentItems, get().activePromotions));
    await syncToDb(userId, storeId, currentItems);
    if (itemToRemove) trackProductEvent(productId, storeId, 'removed', itemToRemove.price * itemToRemove.qty);
  },

  checkoutCart: async (userId, storeId) => {
    const currentItems = get().items;
    currentItems.forEach(item => trackProductEvent(item.productId, storeId, 'purchased', item.price * item.qty));
    set({ items: [], itemCount: 0, totalPrice: 0 });
    await syncToDb(userId, storeId, []);
  },

  clearCart: () => set({ items: [], itemCount: 0, totalPrice: 0 })
}));