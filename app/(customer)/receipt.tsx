import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ReceiptScreen() {
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  
  // Intercept the offline parameters passed directly from checkout
  const { orderId, totalAmount, items } = useLocalSearchParams();
  
  // Safely parse the cart items
  const parsedItems = items ? JSON.parse(items as string) : [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={60} color="#FFF" />
        </View>
        
        <Text style={[styles.title, { color: colors.textPrimary }]}>Payment Successful!</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
          Please show this receipt to the security desk if requested upon exit.
        </Text>

        <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>ORDER REFERENCE</Text>
          <Text style={[styles.orderIdText, { color: colors.textPrimary }]}>
            #{String(orderId).substring(0, 15).toUpperCase()}
          </Text>
          
          <View style={[styles.divider, { borderBottomColor: colors.border }]} />

          <View style={{ width: '100%' }}>
            <Text style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: 12 }}>PURCHASED ITEMS</Text>
            
            {parsedItems.length > 0 ? (
              parsedItems.map((item: any, idx: number) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={{ color: colors.textSecondary, width: 30 }}>{item.qty}x</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{item.name}</Text>
                  <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>₹{item.price * item.qty}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No items recorded.</Text>
            )}

            <View style={[styles.divider, { borderBottomColor: colors.border }]} />
            
            <View style={styles.totalRow}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>Total Paid</Text>
              <Text style={{ color: colors.primary, fontSize: 24, fontWeight: 'bold' }}>₹{totalAmount}</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.homeBtn, { backgroundColor: colors.primary }]}
        onPress={() => router.replace('/(customer)/home')}
      >
        <Text style={styles.homeBtnText}>Continue Shopping</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 80 },
  content: { flex: 1, alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 24, elevation: 4 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12 },
  receiptCard: { width: '100%', padding: 24, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  orderIdText: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
  divider: { width: '100%', borderBottomWidth: 1, marginVertical: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  homeBtn: { height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  homeBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});