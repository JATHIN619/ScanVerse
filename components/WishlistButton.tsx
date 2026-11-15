import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { theme } from '../constants/theme';

export default function WishlistButton({ product }: { product: any }) {
  const user = useAuthStore(state => state.profile);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];

  // Instantly checks if this specific product is in the global state
  const isSaved = isInWishlist(product?.id);

  const handleToggle = () => {
    if (!user?.id || !product) return;
    toggleWishlist(product, user.id);
  };

  return (
    <TouchableOpacity onPress={handleToggle} style={styles.btn} activeOpacity={0.7}>
      <Ionicons 
        name={isSaved ? "heart" : "heart-outline"} 
        size={24} 
        color={isSaved ? "#ef4444" : colors.textSecondary} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 8, zIndex: 10 } // zIndex ensures it's clickable if placed over images
});