import { create } from 'zustand';

interface CartState {
  itemCount: number;
  totalPrice: number;
  setCartStats: (count: number, total: number) => void;
}

export const useCartStore = create<CartState>((set) => ({
  itemCount: 0,
  totalPrice: 0,
  setCartStats: (count, total) => set({ itemCount: count, totalPrice: total }),
}));