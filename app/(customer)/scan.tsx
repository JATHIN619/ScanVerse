import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useStoreStore } from '../../store/storeStore';
import { useCartStore } from '../../store/cartStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function CustomerScan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const user = useAuthStore(state => state.profile);
  const activeStore = useStoreStore(state => state.activeStore);
  const addItem = useCartStore(state => state.addItem);
  
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];

  // Re-enable scanner every time the tab is opened
  useFocusEffect(
    useCallback(() => {
      setScanning(true);
    }, [])
  );

  // Analytics tracking function
  const logScanEvent = async (productId: string, storeId?: string) => {
    try {
      const { error } = await supabase
        .from('scan_analytics')
        .insert([
          { 
            product_id: productId, 
            store_id: storeId || null 
          }
        ]);
        
      if (error) {
        console.error("Failed to log scan analytics:", error);
      }
    } catch (err) {
      console.error("Analytics execution error:", err);
    }
  };

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (!scanning || !activeStore || !user) return;
    setScanning(false); // Pause scanner to prevent duplicate hits
    setLoading(true);

    // Look up product in this specific store
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', activeStore.id)
      .eq('barcode', data)
      .maybeSingle();

    setLoading(false);

    if (error || !product) {
      Alert.alert(
        'Product Not Found', 
        `This barcode isn't in ${activeStore.name}'s catalog yet.`, 
        [{ text: 'Scan Again', onPress: () => setScanning(true) }]
      );
      return;
    }

    // Silently log the scan event for analytics (before stock checks to track true interest)
    logScanEvent(product.id, activeStore.id);

    if (product.stock_qty <= 0) {
      Alert.alert('Out of Stock', 'This item is currently out of stock.', [{ text: 'OK', onPress: () => setScanning(true) }]);
      return;
    }

    const success = await addItem(product, user.id, activeStore.id);
    
    if (success) {
      Alert.alert(
        'Added to Cart', 
        `${product.name} - ₹${product.price}`, 
        [
          { text: 'Keep Scanning', onPress: () => setScanning(true) },
          { text: 'Go to Cart', onPress: () => router.push('/(customer)/cart') }
        ]
      );
    } else {
      Alert.alert('Stock Limit Reached', 'You cannot add more of this item.', [{ text: 'OK', onPress: () => setScanning(true) }]);
    }
  }

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textPrimary, marginBottom: 20 }}>Camera access is needed to scan products.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, width: '80%' }]} onPress={requestPermission}>
          <Text style={styles.btnText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {scanning ? (
        <CameraView 
          style={StyleSheet.absoluteFillObject} 
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
             <Text style={{ color: '#FFF' }}>Paused</Text>
          )}
        </View>
      )}

      {/* UI Overlay */}
      <View style={styles.overlay}>
        <View style={styles.scanTarget} />
        <Text style={styles.scanText}>Line up product barcode</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' },
  scanTarget: { width: 250, height: 150, borderWidth: 2, borderColor: '#1E8E5A', backgroundColor: 'transparent', borderRadius: 12 },
  scanText: { color: '#FFF', fontSize: 18, marginTop: 24, fontWeight: 'bold' },
  btn: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
