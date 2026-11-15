import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function OrdersScreen() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: storeData } = await supabase.from('stores').select('id').eq('owner_id', user.id).single();
      if (storeData) {
        const { data: ordersData, error } = await supabase.rpc('get_store_orders', { target_store_id: storeData.id });
        if (error) throw error;
        if (ordersData) setOrders(ordersData);
      }
    } catch (err) {
      console.error("Orders Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, [user]));

  const renderOrder = ({ item }: { item: any }) => {
    const orderDate = new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.orderId, { color: colors.textPrimary }]}>Order #{item.id.substring(0, 8).toUpperCase()}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>{orderDate}</Text>
            
            {/* Customer Identity Tag */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-circle" size={16} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                {item.customer_name}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.totalAmount, { color: colors.primary }]}>₹{item.total_amount}</Text>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        {/* Item Ledger */}
        <View style={styles.itemList}>
          {item.items && item.items.length > 0 ? (
            item.items.map((prod: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={{ color: colors.textSecondary, width: 30, fontWeight: 'bold' }}>{prod.qty}x</Text>
                <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>{prod.name}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.textSecondary, fontStyle: 'italic', fontSize: 12 }}>
              No item details recorded for this transaction.
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Recent Orders</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No completed orders yet.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  totalAmount: { fontSize: 20, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 12 },
  itemList: { marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemName: { fontSize: 14, flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }
});