import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStoreStore } from '../../store/storeStore';
import { useCartStore } from '../../store/cartStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function CartScreen() {
  const user = useAuthStore(state => state.profile);
  const activeStore = useStoreStore(state => state.activeStore);
  const { items, totalPrice, updateQty, removeItem } = useCartStore();
  
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];

  if (!user || !activeStore) return null;

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.cartItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>₹{item.price}</Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.stepper}>
          <TouchableOpacity 
            onPress={() => updateQty(item.productId, -1, user.id, activeStore.id)}
            style={[styles.stepBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="remove" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.qtyText, { color: colors.textPrimary }]}>{item.qty}</Text>
          <TouchableOpacity 
            onPress={() => updateQty(item.productId, 1, user.id, activeStore.id)}
            style={[styles.stepBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => removeItem(item.productId, user.id, activeStore.id)}>
          <Ionicons name="trash-outline" size={24} color={colors.error} style={{ marginLeft: 16 }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Your Cart</Text>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 18, marginTop: 16 }}>Your cart is empty.</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={item => item.productId}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
          <View style={[styles.checkoutBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Total to Pay</Text>
              <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' }}>₹{totalPrice.toFixed(2)}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.payBtn, { backgroundColor: colors.primary }]}
              onPress={() => console.log('Proceed to Checkout')}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', paddingHorizontal: 20, marginBottom: 16 },
  cartItem: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderRadius: 12 },
  itemName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, borderColor: '#E5E7EB' },
  stepBtn: { padding: 8 },
  qtyText: { paddingHorizontal: 12, fontSize: 16, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  checkoutBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderTopWidth: 1 },
  payBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 }
});