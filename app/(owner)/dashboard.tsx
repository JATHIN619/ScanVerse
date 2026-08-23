import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function OwnerHomeScreen() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0 });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchDashboardData() {
        if (!user) return;
        setLoading(true);

        // 1. Authenticate the owner's store
        const { data: storeData } = await supabase
          .from('stores')
          .select('id, name')
          .eq('owner_id', user.id)
          .single();

        if (!storeData) {
          if (isActive) setLoading(false);
          return;
        }

        if (isActive) setStoreName(storeData.name);

        // 2. Fetch all successful orders for this specific store
        const { data: orderData, error } = await supabase
          .from('orders')
          .select('*, users ( name, email )')
          .eq('store_id', storeData.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching store orders:", error);
        } else if (isActive && orderData) {
          setOrders(orderData);
          
          // Calculate live revenue
          const totalRev = orderData.reduce((sum, order) => sum + order.total_amount, 0);
          setStats({ revenue: totalRev, ordersCount: orderData.length });
        }
        
        if (isActive) setLoading(false);
      }

      fetchDashboardData();
      return () => { isActive = false; };
    }, [user])
  );

  const renderTransaction = ({ item }: { item: any }) => {
    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(item.created_at).toLocaleDateString();

    return (
      <View style={[styles.transactionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.customerName, { color: colors.textPrimary }]}>
              {item.users?.name || 'Anonymous Customer'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {date} at {time}
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.primary }]}>+₹{item.total_amount.toFixed(2)}</Text>
        </View>
        
        <View style={[styles.divider, { borderBottomColor: colors.border }]} />
        
        {item.items.map((prod: any, idx: number) => (
          <Text key={idx} style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
            {prod.qty}x {prod.name}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>Overview</Text>
        <Text style={[styles.storeName, { color: colors.textPrimary }]}>{storeName || 'My Store'}</Text>
      </View>

      {/* KPI Metrics */}
      <View style={styles.metricsContainer}>
        <View style={[styles.metricBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="cash-outline" size={24} color={colors.primary} />
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Revenue</Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>₹{stats.revenue.toFixed(2)}</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="cart-outline" size={24} color={colors.secondary} />
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Orders</Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{stats.ordersCount}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Transactions</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No sales yet.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  storeName: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  metricsContainer: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  metricBox: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, elevation: 2 },
  metricLabel: { fontSize: 13, marginTop: 8, marginBottom: 4, fontWeight: '600' },
  metricValue: { fontSize: 24, fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  transactionCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  amount: { fontSize: 18, fontWeight: 'bold' },
  divider: { borderBottomWidth: 1, marginVertical: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 }
});