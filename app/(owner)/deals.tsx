import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function DealsManagerScreen() {
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  const user = useAuthStore((state) => state.profile);
  
  const [storeId, setStoreId] = useState<string | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [discountType, setDiscountType] = useState<'percentage'|'fixed_price'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [selectedItems, setSelectedItems] = useState<{name: string, qty: number}[]>([]);

  const fetchDealsAndProducts = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: storeData } = await supabase.from('stores').select('id').eq('owner_id', user.id).single();
      if (storeData) {
        setStoreId(storeData.id);
        const [promosRes, prodsRes] = await Promise.all([
          supabase.from('store_promotions').select('*').eq('store_id', storeData.id),
          supabase.from('products').select('name').eq('store_id', storeData.id).order('name')
        ]);
        if (promosRes.data) setDeals(promosRes.data);
        if (prodsRes.data) setProducts(prodsRes.data);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchDealsAndProducts(); }, [user]));

  const adjustItemQty = (name: string, delta: number) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.name === name);
      if (existing) {
        const newQty = existing.qty + delta;
        if (newQty <= 0) return prev.filter(i => i.name !== name);
        return prev.map(i => i.name === name ? { ...i, qty: newQty } : i);
      } else if (delta > 0) {
        return [...prev, { name, qty: 1 }];
      }
      return prev;
    });
  };

  const handleSaveDeal = async () => {
    if (!bundleName.trim()) return Alert.alert("Error", "Please provide a name for the bundle.");
    if (selectedItems.length < 2) return Alert.alert("Error", "A bundle must contain at least 2 items.");
    
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return Alert.alert("Error", "Invalid discount value.");
    if (discountType === 'percentage' && val > 100) return Alert.alert("Error", "Percentage cannot exceed 100.");

    const { error } = await supabase.from('store_promotions').insert({
      store_id: storeId,
      bundle_name: bundleName,
      required_items: selectedItems,
      discount_type: discountType,
      discount_value: val
    });

    if (error) Alert.alert("Database Error", error.message);
    else {
      Alert.alert("Success", "Deal published!");
      setModalVisible(false);
      setBundleName(''); setSelectedItems([]); setDiscountValue('');
      fetchDealsAndProducts();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('store_promotions').delete().eq('id', id);
    if (!error) setDeals(prev => prev.filter(d => d.id !== id));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Manage Deals</Text>
      </View>

      <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 16 }}>Create New Bundle</Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {deals.map(deal => (
            <View key={deal.id} style={[styles.dealCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 4 }}>
                  {deal.discount_type === 'percentage' ? `${deal.discount_value}% OFF` : `Combo @ ₹${deal.discount_value}`}
                </Text>
                <Text style={[styles.dealTitle, { color: colors.textPrimary }]}>{deal.bundle_name}</Text>
                {deal.required_items.map((item: any, i: number) => (
                  <Text key={i} style={{ color: colors.textSecondary, fontSize: 12 }}>• {item.qty}x {item.name}</Text>
                ))}
              </View>
              <TouchableOpacity onPress={() => handleDelete(deal.id)} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          {deals.length === 0 && <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>No active deals.</Text>}
        </ScrollView>
      )}

      {/* Create Deal Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>New Bundle</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} placeholder="Bundle Name (e.g. Snack Pack)" placeholderTextColor={colors.textSecondary} value={bundleName} onChangeText={setBundleName} />

            <Text style={{ color: colors.textPrimary, fontWeight: 'bold', marginVertical: 12 }}>Discount Type</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'percentage' ? colors.primary : colors.surface, alignItems: 'center' }} onPress={() => setDiscountType('percentage')}>
                <Text style={{ fontWeight: 'bold', color: discountType === 'percentage' ? '#FFF' : colors.textSecondary }}>% OFF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: discountType === 'fixed_price' ? colors.primary : colors.surface, alignItems: 'center' }} onPress={() => setDiscountType('fixed_price')}>
                <Text style={{ fontWeight: 'bold', color: discountType === 'fixed_price' ? '#FFF' : colors.textSecondary }}>Fixed Price</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} keyboardType="numeric" placeholder={discountType === 'percentage' ? "e.g. 15 for 15% off" : "e.g. 500 for ₹500 total"} placeholderTextColor={colors.textSecondary} value={discountValue} onChangeText={setDiscountValue} />

            <Text style={{ color: colors.textPrimary, fontWeight: 'bold', marginVertical: 12 }}>Select Products</Text>
            {products.map(prod => {
              const selected = selectedItems.find(i => i.name === prod.name);
              const qty = selected ? selected.qty : 0;
              return (
                <View key={prod.name} style={[styles.productRow, { borderColor: colors.border, backgroundColor: qty > 0 ? 'rgba(30, 142, 90, 0.05)' : colors.surface }]}>
                  <Text style={{ color: colors.textPrimary, flex: 1 }} numberOfLines={1}>{prod.name}</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => adjustItemQty(prod.name, -1)}>
                      <Ionicons name="remove" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.textPrimary }]}>{qty}</Text>
                    <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]} onPress={() => adjustItemQty(prod.name, 1)}>
                      <Ionicons name="add" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveDeal}>
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>Launch Deal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginBottom: 24 },
  dealCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  dealTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  
  modalContainer: { flex: 1, padding: 20, paddingTop: 60 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  stepBtn: { padding: 4 },
  qtyText: { width: 30, textAlign: 'center', fontWeight: 'bold' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, marginBottom: 40 }
});