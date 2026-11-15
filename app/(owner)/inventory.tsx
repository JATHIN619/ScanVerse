import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';

export default function InventoryScreen() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);

  const fetchInventory = async () => {
    if (!user) return;
    setLoading(true);

    const { data: storeData } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (storeData) {
      setStoreId(storeData.id);
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeData.id)
        .order('name');
        
      if (error) {
        console.error("Error fetching products:", error);
      } else if (productsData) {
        setProducts(productsData);
      }
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [user])
  );

  async function adjustStock(productId: string, currentQty: number, delta: number) {
    const newQty = Math.max(0, currentQty + delta);
    
    // Optimistic UI update
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_qty: newQty } : p));

    const { error } = await supabase
      .from('products')
      .update({ stock_qty: newQty })
      .eq('id', productId);

    if (error) {
      Alert.alert("Sync Error", "Failed to update stock in database.");
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_qty: currentQty } : p));
    }
  }

  // STRICT DELETE CHECK: Forces Supabase to return the row. If empty, RLS blocked it silently.
  const handleDeleteProduct = (productId: string, productName: string) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to permanently delete "${productName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const { data, error } = await supabase
              .from('products')
              .delete()
              .eq('id', productId)
              .select(); // .select() is mandatory here to catch silent RLS failures
            
            if (error) {
              Alert.alert("Database Error", error.message);
              console.error("Delete Error:", error);
            } else if (!data || data.length === 0) {
              Alert.alert("Blocked", "The database silently refused to delete this item. Ensure the RLS override SQL was executed.");
            } else {
              setProducts(prev => prev.filter(p => p.id !== productId));
              Alert.alert("Success", "Product permanently deleted.");
            }
          }
        }
      ]
    );
  };

  const handleImportCSV = async () => {
    if (!storeId) return Alert.alert("Error", "Store identity not found.");
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', 
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      setUploading(true);
      const fileUri = result.assets[0].uri;
      
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedData = results.data;
          
          if (parsedData.length === 0) {
            Alert.alert("Empty File", "The CSV file contains no readable data.");
            setUploading(false);
            return;
          }

          const formattedData = parsedData.map((row: any) => ({
            store_id: storeId,
            name: row.name || "Unnamed Item",
            category: row.category || "General",
            price: parseFloat(row.price) || 0,
            stock_qty: parseInt(row.stock_qty, 10) || 0,
            barcode: row.barcode || null,
            low_stock_threshold: parseInt(row.low_stock_threshold, 10) || 5
          }));

          const { error } = await supabase.from('products').insert(formattedData);
          
          if (error) {
            Alert.alert("Import Error", error.message);
          } else {
            Alert.alert("Success", `Successfully imported ${formattedData.length} products.`);
            fetchInventory(); 
          }
          setUploading(false);
        },
        error: (error: any) => {
          Alert.alert("Parse Error", error.message);
          setUploading(false);
        }
      });

    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to process the file.");
      setUploading(false);
    }
  };

  const renderProduct = ({ item }: { item: any }) => {
    const isLowStock = item.stock_qty <= item.low_stock_threshold;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: isLowStock ? colors.error : colors.border }]}>
        <View style={styles.cardInfo}>
          <Text style={[styles.productName, { color: colors.textPrimary }]}>{item.name}</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Barcode: {item.barcode || 'N/A'}</Text>
          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>₹{item.price}</Text>
          
          {isLowStock && (
            <Text style={{ color: colors.error, fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
              LOW STOCK (Threshold: {item.low_stock_threshold})
            </Text>
          )}
        </View>

        <View style={styles.stockControls}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4, textAlign: 'center' }}>Stock</Text>
          <View style={[styles.stepper, { borderColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.stepBtn, { borderRightWidth: 1, borderColor: colors.border }]} 
              onPress={() => adjustStock(item.id, item.stock_qty, -1)}
            >
              <Ionicons name="remove" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            
            <Text style={[styles.qtyText, { color: isLowStock ? colors.error : colors.textPrimary }]}>
              {item.stock_qty}
            </Text>
            
            <TouchableOpacity 
              style={[styles.stepBtn, { borderLeftWidth: 1, borderColor: colors.border }]} 
              onPress={() => adjustStock(item.id, item.stock_qty, 1)}
            >
              <Ionicons name="add" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={() => handleDeleteProduct(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Inventory</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }]}
            onPress={handleImportCSV}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: 'bold', marginLeft: 4 }}>CSV</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(owner)/add-product')}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 4 }}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Your inventory is empty.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardInfo: { flex: 1, paddingRight: 12 },
  productName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  stockControls: { alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, marginBottom: 12 },
  stepBtn: { padding: 8 },
  qtyText: { width: 40, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }
});