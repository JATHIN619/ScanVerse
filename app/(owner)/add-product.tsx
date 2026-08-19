import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AddProduct() {
  const user = useAuthStore(state => state.profile);
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  const params = useLocalSearchParams();

  // Form State
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [threshold, setThreshold] = useState('5');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  // Camera State
  const [scanning, setScanning] = useState(params.scan === 'true');
  const [permission, requestPermission] = useCameraPermissions();

  async function handleSave() {
    if (!name || !barcode || !price || !stockQty) return Alert.alert('Error', 'Required fields missing');
    setLoading(true);

    const { data: storeData } = await supabase.from('stores').select('id').eq('owner_id', user?.id).maybeSingle();
    if (!storeData) {
      setLoading(false);
      return Alert.alert('Error', 'Store not found');
    }

    const { error } = await supabase.from('products').insert({
      store_id: storeData.id,
      name: name.trim(),
      barcode: barcode.trim(),
      price: parseFloat(price),
      stock_qty: parseInt(stockQty, 10),
      low_stock_threshold: parseInt(threshold, 10),
      category: category.trim()
    });

    if (error) {
      Alert.alert('Save Failed', error.message);
    } else {
      Alert.alert('Success', 'Product added to catalog!');
      router.back();
    }
    setLoading(false);
  }

  if (scanning) {
    if (!permission) return <View />;
    if (!permission.granted) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: colors.textPrimary, marginBottom: 20 }}>Camera permission is required to scan barcodes.</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, width: '80%' }]} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <CameraView 
          style={StyleSheet.absoluteFillObject} 
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }}
          onBarcodeScanned={({ data }) => {
            setBarcode(data);
            setScanning(false);
          }}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanTarget} />
          <Text style={styles.scanText}>Position barcode inside the frame</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.error, width: '80%', marginTop: 40 }]} onPress={() => setScanning(false)}>
            <Text style={styles.buttonText}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Add Product</Text>
      </View>

      <View style={styles.barcodeRow}>
        <TextInput
          style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, marginBottom: 0 }]}
          placeholder="Barcode (Scan or Type)"
          placeholderTextColor={colors.textSecondary}
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="numeric"
        />
        <TouchableOpacity 
          style={[styles.scanIconBtn, { backgroundColor: colors.secondary }]}
          onPress={() => setScanning(true)}
        >
          <Ionicons name="barcode-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, marginTop: 16 }]}
        placeholder="Product Name"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />
      
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextInput
          style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Price (₹)"
          placeholderTextColor={colors.textSecondary}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Stock Qty"
          placeholderTextColor={colors.textSecondary}
          value={stockQty}
          onChangeText={setStockQty}
          keyboardType="number-pad"
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextInput
          style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Low Stock Alert at"
          placeholderTextColor={colors.textSecondary}
          value={threshold}
          onChangeText={setThreshold}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Category"
          placeholderTextColor={colors.textSecondary}
          value={category}
          onChangeText={setCategory}
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary, marginTop: 24 }]} 
        onPress={handleSave} 
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Product'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold' },
  input: { height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, marginBottom: 16 },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scanIconBtn: { height: 50, width: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  scanTarget: { width: 250, height: 150, borderWidth: 2, borderColor: '#4ADE80', backgroundColor: 'transparent', borderRadius: 12 },
  scanText: { color: '#FFF', fontSize: 18, marginTop: 20, fontWeight: 'bold' }
});