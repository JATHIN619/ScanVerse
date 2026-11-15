import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../services/supabase';
import WishlistButton from './WishlistButton'; // Injected the Wishlist Button

interface Product {
  id: string;
  name: string;
  category: string;
  stock_qty: number;
  similarity: number;
}

export default function AIRecommendations({ currentProductId }: { currentProductId: string }) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const { data, error } = await supabase.rpc('get_related_products', {
          target_product_id: currentProductId,
          match_limit: 5
        });

        if (error) throw error;
        if (data) setRecommendations(data);
      } catch (err) {
        console.error("AI Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (currentProductId) {
      fetchRecommendations();
    }
  }, [currentProductId]);

  if (loading) return <ActivityIndicator size="small" color="#0000ff" style={{ marginTop: 20 }} />;
  if (recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>You might also like</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={recommendations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.9}>
            {/* Added a flex row to push the heart button to the top right */}
            <View style={styles.cardHeader}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <WishlistButton product={item} /> 
            </View>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.match}>{(item.similarity * 100).toFixed(0)}% Match</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 20, paddingLeft: 15 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  card: { 
    width: 160, // Made slightly wider to fit the heart icon cleanly
    padding: 12, 
    backgroundColor: '#f8f9fa', 
    borderRadius: 12, 
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  name: { fontSize: 14, fontWeight: '600', color: '#111', flex: 1, paddingRight: 8 },
  category: { fontSize: 12, color: '#6c757d', marginVertical: 4 },
  match: { fontSize: 12, fontWeight: 'bold', color: '#2b6cb0' }
});