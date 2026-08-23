import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function OrdersScreen() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchOrders() {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            payment_status,
            created_at,
            items,
            stores ( name )
          `)
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching orders:", error);
        } else if (isActive && data) {
          setOrders(data);
        }
        
        if (isActive) setLoading(false);
      }

      fetchOrders();
      return () => { isActive = false; };
    }, [user])
  );

  const renderOrder = ({ item }: { item: any }) => {
    const date = new Date(item.created_at).toLocaleDateString();
    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.storeName, { color: colors.textPrimary }]}>{item.stores?.name || 'Unknown Store'}</Text>
          <Text style={[styles.status, { color: colors.primary }]}>{item.payment_status.toUpperCase()}</Text>
        </View>
        
        <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>{date} at {time}</Text>
        
        <View style={[styles.divider, { borderBottomColor: colors.border }]} />
        
        {item.items.map((prod: any, index: number) => (
          <View key={index} style={styles.itemRow}>
            <Text style={{ color: colors.textPrimary }}>{prod.qty}x {prod.name}</Text>
            <Text style={{ color: colors.textPrimary }}>₹{prod.price * prod.qty}</Text>
          </View>
        ))}
        
        <View style={[styles.divider, { borderBottomColor: colors.border }]} />
        
        <View style={styles.totalRow}>
          <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16 }}>Total</Text>
          <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18 }}>₹{item.total_amount.toFixed(2)}</Text>
        </View>
        
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 12, textAlign: 'center' }}>
          Order ID: {item.id.split('-')[0]}...
        </Text>
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
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 16 }}>You have no past orders.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold' },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  storeName: { fontSize: 18, fontWeight: 'bold' },
  status: { fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  divider: { borderBottomWidth: 1, marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }
});