import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useStoreStore } from '../../store/storeStore';
import { useCartStore } from '../../store/cartStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const activeStore = useStoreStore((state) => state.activeStore);
  const { itemCount, totalPrice } = useCartStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Store Status Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
          CURRENTLY SHOPPING AT
        </Text>
        <Text style={[styles.storeName, { color: colors.primary }]}>
          {activeStore ? activeStore.name : 'No Store Selected'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          {activeStore ? activeStore.address : 'Please go to Account to select a store.'}
        </Text>
      </View>

      {/* Live Cart Pill */}
      <TouchableOpacity 
        style={[styles.cartPill, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(customer)/cart')}
        activeOpacity={0.9}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="cart" size={28} color="#FFF" />
          <View>
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600', opacity: 0.9 }}>
              Cart Total
            </Text>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>
              {itemCount} Items
            </Text>
          </View>
        </View>
        <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>
          ₹{totalPrice.toFixed(2)}
        </Text>
      </TouchableOpacity>

      {/* Recommendation Strip Placeholder (T10) */}
      <View style={{ marginTop: 32 }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>You may also like</Text>
        <View style={[styles.recPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="sparkles" size={24} color={colors.textSecondary} style={{ marginBottom: 8 }} />
          <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 }}>
            Scan your first item to see AI recommendations here.
          </Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  headerCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  storeName: { fontSize: 24, fontWeight: 'bold', marginVertical: 6 },
  cartPill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, elevation: 6, shadowColor: '#1E8E5A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  recPlaceholder: { padding: 32, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }
});