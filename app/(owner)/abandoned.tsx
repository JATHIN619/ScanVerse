import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AbandonedItemsScreen() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const [loading, setLoading] = useState(true);
  const [abandonedItems, setAbandonedItems] = useState<any[]>([]);

  const fetchAbandonedItems = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: storeData } = await supabase.from('stores').select('id').eq('owner_id', user.id).single();
      if (storeData) {
        // Reuse the advanced dashboard SQL function to fetch the analytics
        const { data: statsData, error } = await supabase.rpc('get_advanced_dashboard', { target_store_id: storeData.id });
        if (error) throw error;
        if (statsData && statsData.most_abandoned) {
          setAbandonedItems(statsData.most_abandoned);
        }
      }
    } catch (err) {
      console.error("Abandoned Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAbandonedItems(); }, [user]));

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.rank, { color: '#ef4444' }]}>#{index + 1}</Text>
        <View>
          <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Frequently removed from cart</Text>
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 18 }}>{item.drop_count}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>DROPS</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Abandoned Items</Text>
      </View>

      <Text style={{ color: colors.textSecondary, marginBottom: 24, fontSize: 14 }}>
        These are the products most frequently scanned by customers but removed before checkout. Consider adjusting their prices.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : abandonedItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.primary} />
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>No Drop-offs</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Your customers aren't abandoning items.</Text>
        </View>
      ) : (
        <FlatList
          data={abandonedItems}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  rank: { fontSize: 20, fontWeight: 'bold', marginRight: 16 },
  itemName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }
});