import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function Inventory() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchInventory() {
        if (!user) return;
        setLoading(true);

        // 1. Get the store ID
        const { data: storeData } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (storeData && isActive) {
          // 2. Get the products
          const { data: productData } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeData.id)
            .order('created_at', { ascending: false });

          if (productData) setProducts(productData);
        }
        if (isActive) setLoading(false);
      }

      fetchInventory();
      return () => { isActive = false; };
    }, [user])
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.productName, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={{ color: colors.textSecondary }}>Barcode: {item.barcode}</Text>
        <Text style={{ color: colors.textSecondary }}>Category: {item.category || 'N/A'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.price, { color: colors.primary }]}>₹{item.price}</Text>
        <Text style={{ color: item.stock_qty <= item.low_stock_threshold ? colors.error : colors.textSecondary }}>
          Stock: {item.stock_qty}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Inventory</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(owner)/add-product')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 4 }}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No products found.</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Tap the center scan button to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold' },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  card: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, elevation: 1 },
  productName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  price: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});