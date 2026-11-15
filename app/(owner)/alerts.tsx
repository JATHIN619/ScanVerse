import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
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

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string, name: string, currentStock: number } | null>(null);
  const [restockAmount, setRestockAmount] = useState('');

  const fetchAlerts = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: storeData } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (storeData) {
        const { data: productsData, error } = await supabase
          .from('products')
          .select('id, name, stock_qty, low_stock_threshold')
          .eq('store_id', storeData.id)
          .order('stock_qty', { ascending: true });
          
        if (error) throw error;

        if (productsData) {
          // Filter dynamically based on each item's specific threshold
          const filteredAlerts = productsData.filter(p => p.stock_qty <= p.low_stock_threshold);
          setAlerts(filteredAlerts);
        }
      }
    } catch (err) {
      console.error("Alerts Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
    }, [user])
  );

  const openRestockModal = (product: any) => {
    setSelectedProduct({ id: product.id, name: product.name, currentStock: product.stock_qty });
    setRestockAmount(''); // Clear previous input
    setModalVisible(true);
  };

  const executeRestock = async () => {
    const amount = parseInt(restockAmount, 10);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid number greater than 0.");
      return;
    }

    if (!selectedProduct) return;

    const newStock = selectedProduct.currentStock + amount;

    // Update database
    const { error } = await supabase
      .from('products')
      .update({ stock_qty: newStock })
      .eq('id', selectedProduct.id);

    if (error) {
      Alert.alert("Error", "Failed to restock item.");
    } else {
      // Remove from alerts UI instantly
      setAlerts(prev => prev.filter(a => a.id !== selectedProduct.id));
      setModalVisible(false);
    }
  };

  const renderAlertCard = ({ item }: { item: any }) => {
    const isOutOfStock = item.stock_qty === 0;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: isOutOfStock ? '#ef4444' : '#f59e0b' }]}>
        <View style={styles.iconBox}>
          <Ionicons name={isOutOfStock ? "warning" : "alert-circle"} size={32} color={isOutOfStock ? "#ef4444" : "#f59e0b"} />
        </View>
        
        <View style={styles.cardInfo}>
          <Text style={[styles.productName, { color: colors.textPrimary }]}>{item.name}</Text>
          <Text style={{ color: isOutOfStock ? '#ef4444' : '#f59e0b', fontWeight: 'bold', fontSize: 14 }}>
            {isOutOfStock ? 'OUT OF STOCK' : `LOW STOCK: ${item.stock_qty} left`}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Threshold: {item.low_stock_threshold}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.restockBtn, { backgroundColor: colors.primary }]}
          onPress={() => openRestockModal(item)}
        >
          <Ionicons name="cube" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 12 }}>Restock</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Action Alerts</Text>
        <View style={[styles.badge, { backgroundColor: alerts.length > 0 ? '#ef4444' : colors.primary }]}>
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{alerts.length}</Text>
        </View>
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
          renderItem={renderAlertCard}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Dynamic Restock Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Restock Inventory</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
              How many units of <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>{selectedProduct?.name}</Text> are you adding?
            </Text>
            
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              keyboardType="numeric"
              placeholder="e.g. 24"
              placeholderTextColor={colors.textSecondary}
              value={restockAmount}
              onChangeText={setRestockAmount}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.background }]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.primary }]} 
                onPress={executeRestock}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginRight: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  iconBox: { marginRight: 16 },
  cardInfo: { flex: 1 },
  productName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  restockBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 24, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, fontSize: 18, marginBottom: 24, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalBtn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' }
});