import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useStoreStore } from '../../store/storeStore';
import { useCartStore } from '../../store/cartStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function CustomerAccountScreen() {
  const mode = useThemeStore(state => state.mode);
  const toggleTheme = useThemeStore(state => state.toggleTheme); 
  const colors = theme.colors[mode];
  
  const user = useAuthStore(state => state.profile);
  
  const activeStore = useStoreStore(state => state.activeStore);
  const setActiveStore = useStoreStore(state => state.setActiveStore);
  const clearCart = useCartStore(state => state.clearCart);

  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAvailableStores() {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name, address, owner_id')
          .order('name');

        if (error) throw error;
        if (data) setStores(data);
      } catch (err) {
        console.error("Store Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailableStores();
  }, []);

  const handleSelectStore = (store: any) => {
    if (activeStore && activeStore.id !== store.id) {
      Alert.alert(
        "Change Store?",
        "Switching to a different store will clear your current cart.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Switch Store", 
            style: "destructive",
            onPress: () => {
              clearCart();
              setActiveStore(store);
              router.push('/(customer)/home');
            }
          }
        ]
      );
    } else {
      setActiveStore(store);
      router.push('/(customer)/home');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      clearCart();
      setActiveStore(null); 
      router.replace('/'); 
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>My Account</Text>
        <Text style={{ color: colors.textSecondary }}>{user?.email}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Select a Store</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 16, fontSize: 14 }}>
        Choose a location to start scanning and shopping.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : stores.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={48} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No stores available right now.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={stores}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = activeStore?.id === item.id;
              return (
                <TouchableOpacity 
                  style={[
                    styles.storeCard, 
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1
                    }
                  ]}
                  onPress={() => handleSelectStore(item)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.storeName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.address}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </View>
      )}

      <View style={styles.settingsContainer}>
        {/* Order History Button */}
        <TouchableOpacity 
          style={[styles.historyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(customer)/history')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="receipt-outline" size={24} color={colors.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>Order History</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>View previous digital receipts</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.textPrimary} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>Dark Mode</Text>
          </View>
          <Switch 
            value={mode === 'dark'} 
            onValueChange={toggleTheme} 
            trackColor={{ false: '#d1d5db', true: colors.primary }}
            thumbColor={'#FFF'}
          />
        </View>

        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: '#ef4444' }]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  storeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
  storeName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  
  settingsContainer: { marginTop: 'auto', marginBottom: 32, gap: 12 },
  historyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1 },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12 },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});