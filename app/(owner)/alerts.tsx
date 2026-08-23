import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AlertsScreen() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchAlerts() {
        if (!user) return;
        setLoading(true);

        const { data: storeData } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (storeData) {
          // Note: In a massive enterprise app, you would write an RPC to compare columns server-side.
          // For this scale, fetching the catalog and filtering in-memory is acceptable.
          const { data: productsData, error } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeData.id);
            
          if (error) {
            console.error("Error fetching products for alerts:", error);
          } else if (isActive && productsData) {
            // Filter strictly for items at or below their specific threshold
            const lowStockItems = productsData.filter(p => p.stock_qty <= p.low_stock_threshold);
            setAlerts(lowStockItems);
          }
        }
        
        if (isActive) setLoading(false);
      }

      fetchAlerts();
      return () => { isActive = false; };
    }, [user])
  );

  const renderAlert = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.error }]}>
      <View style={styles.alertHeader}>
        <Ionicons name="warning" size={24} color={colors.error} />
        <Text style={[styles.alertTitle, { color: colors.error }]}>Restock Required</Text>
      </View>
      
      <Text style={[styles.productName, { color: colors.textPrimary }]}>{item.name}</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>Barcode: {item.barcode}</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Current Stock</Text>
          <Text style={[styles.statValue, { color: colors.error }]}>{item.stock_qty}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Warning Threshold</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{item.low_stock_threshold}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(owner)/inventory')}
      >
        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Manage Inventory</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>System Alerts</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.primary} />
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>All Clear</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Your inventory levels are healthy.</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  productName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 8 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  actionBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }
});