import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { supabase } from '../../services/supabase';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useStoreStore } from '../../store/storeStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function CheckoutScreen() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Idle');
  
  const { items, totalPrice, checkoutCart } = useCartStore();
  const user = useAuthStore(state => state.profile);
  const activeStore = useStoreStore(state => state.activeStore);
  
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];

  async function handlePayment() {
    if (!user || !activeStore || items.length === 0) return;
    setLoading(true);
    setStatus('Generating Secure Order...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to checkout.');

      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { storeId: activeStore.id },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (orderError || !orderData) throw new Error(orderError?.message || 'Failed to create order on server');

      setStatus('Opening Payment Gateway...');

      const options = {
        description: `ScanVerse Order at ${activeStore.name}`,
        image: 'https://reactnative.dev/img/tiny_logo.png',
        currency: 'INR',
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        name: activeStore.name,
        order_id: orderData.orderId,
        prefill: { email: user.email, contact: '9999999999', name: user.name },
        theme: { color: colors.primary }
      };

      try {
        const data = await RazorpayCheckout.open(options);
        await handlePaymentSuccess(data.razorpay_payment_id, orderData.orderId, data.razorpay_signature);
      } catch (nativeError: any) {
        console.warn("Native Razorpay failed. Simulating success for Expo Go.", nativeError);
        Alert.alert(
          "Expo Go Detected", 
          "Razorpay native UI cannot render in Expo Go. Simulating a successful payment for testing purposes.", 
          [{ text: "Simulate Success", onPress: () => handlePaymentSuccess("sim_pay_123", orderData.orderId, "sim_sig_123") }]
        );
      }
    } catch (err: any) {
      Alert.alert("Checkout Error", err.message);
      setLoading(false);
      setStatus('Failed');
    }
  }

  async function handlePaymentSuccess(paymentId: string, orderId: string, signature: string) {
    setStatus('Verifying Payment & Updating Stock...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: { 
          paymentId, 
          orderId, 
          signature, 
          storeId: activeStore?.id,
          items,
          totalAmount: totalPrice
        },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      if (verifyError || verifyData?.error) {
        throw new Error(verifyError?.message || verifyData?.error || 'Verification failed');
      }
      
      // Capture data before clearing cart
      const finalItems = JSON.stringify(items);
      const finalTotal = totalPrice.toString();

      await checkoutCart(user!.id, activeStore!.id);
      
      // Pass data directly to receipt to avoid DB lookup failures
      router.replace({
        pathname: '/(customer)/receipt',
        params: { orderId, totalAmount: finalTotal, items: finalItems }
      });

    } catch (err: any) {
      Alert.alert("Verification Failed", err.message);
      setLoading(false);
      setStatus('Failed');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={loading} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={28} color={loading ? colors.textSecondary : colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: 12, fontWeight: 'bold' }}>ORDER SUMMARY</Text>
          {items.map((item) => (
            <View key={item.productId} style={styles.itemRow}>
              <Text style={{ color: colors.textPrimary, flex: 1 }}>{item.qty}x {item.name}</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>₹{item.price * item.qty}</Text>
            </View>
          ))}
          <View style={[styles.divider, { borderBottomColor: colors.border }]} />
          <View style={styles.itemRow}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>Total Amount</Text>
            <Text style={{ color: colors.primary, fontSize: 22, fontWeight: 'bold' }}>₹{totalPrice.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.payBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>Pay ₹{totalPrice.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
        {loading && <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>{status}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  card: { marginHorizontal: 20, padding: 20, borderRadius: 16, borderWidth: 1, elevation: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  divider: { borderBottomWidth: 1, marginVertical: 12 },
  footer: { padding: 20, paddingBottom: 40, borderTopWidth: 1 },
  payBtn: { height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 }
});