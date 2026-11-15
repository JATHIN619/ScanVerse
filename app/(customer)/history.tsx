import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function OrderHistoryScreen() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrderHistory = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // FIX: Querying Kishan's specific schema
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, total_amount, created_at, items,
          stores (name)
        `)
        .eq('customer_id', user.id) // Uses customer_id instead of user_id
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setOrders(data);
    } catch (err) {
      console.error("History Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOrderHistory(); }, [user]));

  const renderOrder = ({ item }: { item: any }) => {
    const orderDate = new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const storeName = item.stores ? item.stores.name : "Unknown Store";
    
    // Parse Kishan's JSONB items array safely
    const parsedItems = typeof item.items === 'string' ? JSON.parse(item.items) : (item.items || []);

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.storeName, { color: colors.textPrimary }]}>{storeName}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{orderDate} • #{item.id.substring(0, 8).toUpperCase()}</Text>
          </View>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>₹{item.total_amount}</Text>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        {parsedItems.map((oi: any, index: number) => (
          <View key={index} style={styles.itemRow}>
            <Text style={{ color: colors.textSecondary, width: 30, fontWeight: 'bold' }}>{oi.qty}x</Text>
            <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
              {oi.name}
            </Text>
            <Text style={{ color: colors.textSecondary }}>₹{oi.price * oi.qty}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Order History</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>You haven't made any purchases yet.</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  storeName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  totalAmount: { fontSize: 20, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemName: { fontSize: 14, flex: 1, marginRight: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }
});