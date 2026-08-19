import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { supabase } from '../services/supabase';
import { useThemeStore } from '../store/themeStore';
import { useStoreStore } from '../store/storeStore';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

// Helper to calculate distance in km between two coords
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

export default function StoreSelection() {
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  const setActiveStore = useStoreStore((state) => state.setActiveStore);
  
  const [stores, setStores] = useState<any[]>([]);
  const [nearestStore, setNearestStore] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndSortStores() {
      // 1. Fetch all stores
      const { data, error } = await supabase.from('stores').select('*');
      if (error || !data) {
        Alert.alert('Error', 'Could not load stores');
        setLoading(false);
        return;
      }

      // 2. Ask for location
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        try {
          const currentLoc = await Location.getCurrentPositionAsync({});
          const userLat = currentLoc.coords.latitude;
          const userLng = currentLoc.coords.longitude;

          // 3. Sort by distance
          const sorted = data.map(store => ({
            ...store,
            distance: getDistance(userLat, userLng, store.latitude, store.longitude)
          })).sort((a, b) => a.distance - b.distance);

          setNearestStore(sorted[0]); // Closest one
          setStores(sorted.slice(1)); // The rest
        } catch (err) {
          setStores(data); // Location failed, just show list
        }
      } else {
        setStores(data); // Permission denied, just show list
      }
      setLoading(false);
    }

    fetchAndSortStores();
  }, []);

  function handleSelect(store: any) {
    setActiveStore(store);
    router.replace('/(customer)/home');
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textPrimary, textAlign: 'center', marginTop: 10 }}>Finding nearby stores...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Choose a Store</Text>

      {nearestStore && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.textSecondary, marginBottom: 8, fontWeight: 'bold' }}>NEAREST TO YOU</Text>
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 2 }]}
            onPress={() => handleSelect(nearestStore)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.storeName, { color: colors.textPrimary }]}>{nearestStore.name}</Text>
              <Text style={{ color: colors.textSecondary }}>{nearestStore.address}</Text>
              <Text style={{ color: colors.primary, marginTop: 4, fontWeight: 'bold' }}>
                {nearestStore.distance < 1 ? '< 1 km away' : `${nearestStore.distance.toFixed(1)} km away`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <Text style={{ color: colors.textSecondary, marginBottom: 8, fontWeight: 'bold' }}>ALL STORES</Text>
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => handleSelect(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.storeName, { color: colors.textPrimary }]}>{item.name}</Text>
              <Text style={{ color: colors.textSecondary }}>{item.category}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  storeName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 }
});