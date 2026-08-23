import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function InventoryScreen() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchInventory() {
        if (!user) return;
        setLoading(true);

        const { data: storeData } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (storeData) {
          const { data: productsData, error } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeData.id)
            .order('name');
            
          if (error) {
            console.error("Error fetching products:", error);
          } else if (isActive && productsData) {
            setProducts(productsData);
          }
        }
        
        if (isActive) setLoading(false);
      }

      fetchInventory();
      return () => { isActive = false; };
    }, [user])
  );

  async function adjustStock(productId: string, currentQty: number, delta: number) {
    const newQty = Math.max(0, currentQty + delta);
    
    // Optimistic UI update for immediate feedback
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_qty: newQty } : p));

    // Background DB sync
    const { error } = await supabase
      .from('products')
      .update({ stock_qty: newQty })
      .eq('id', productId);

    if (error) {
      Alert.alert("Sync Error", "Failed to update stock in database.");
      // Revert on failure
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_qty: currentQty } : p));
    }
  }

  const renderProduct = ({ item }: { item: any }) => {
    const isLowStock = item.stock_qty <= item.low_stock_threshold;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: isLowStock ? colors.error : colors.border }]}>
        <View style={styles.cardInfo}>
          <Text style={[styles.productName, { color: colors.textPrimary }]}>{item.name}</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Barcode: {item.barcode}</Text>
          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>₹{item.price}</Text>
          
          {isLowStock && (
            <Text style={{ color: colors.error, fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
              LOW STOCK (Threshold: {item.low_stock_threshold})
            </Text>
          )}
        </View>

        <View style={styles.stockControls}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4, textAlign: 'center' }}>Stock</Text>
          <View style={[styles.stepper, { borderColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.stepBtn, { borderRightWidth: 1, borderColor: colors.border }]} 
              onPress={() => adjustStock(item.id, item.stock_qty, -1)}
            >
              <Ionicons name="remove" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            
            <Text style={[styles.qtyText, { color: isLowStock ? colors.error : colors.textPrimary }]}>
              {item.stock_qty}
            </Text>
            
            <TouchableOpacity 
              style={[styles.stepBtn, { borderLeftWidth: 1, borderColor: colors.border }]} 
              onPress={() => adjustStock(item.id, item.stock_qty, 1)}
            >
              <Ionicons name="add" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Inventory</Text>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(owner)/add-product')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 4 }}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Your inventory is empty.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardInfo: { flex: 1, paddingRight: 12 },
  productName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  stockControls: { alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  stepBtn: { padding: 8 },
  qtyText: { width: 40, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }
});