import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';

export default function RegisterStore() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const { mode } = useThemeStore();
  const colors = theme.colors[mode];
  const user = useAuthStore(state => state.profile);

  async function handleGetLocation() {
    setLoadingLoc(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'App needs location to pin your store on the map.');
      setLoadingLoc(false);
      return;
    }

    try {
      let currentLoc = await Location.getCurrentPositionAsync({});
      setLocation({ 
        lat: currentLoc.coords.latitude, 
        lng: currentLoc.coords.longitude 
      });
    } catch (err) {
      Alert.alert('Error', 'Could not fetch location. Ensure GPS is on.');
    }
    setLoadingLoc(false);
  }

  async function handleRegister() {
    if (!name || !category || !address) return Alert.alert('Error', 'Fill all text fields');
    if (!location) return Alert.alert('Error', 'Please capture store location first');
    setLoadingSubmit(true);

    const { error } = await supabase.from('stores').insert({
      owner_id: user?.id,
      name: name.trim(),
      category: category.trim(),
      address: address.trim(),
      latitude: location.lat,
      longitude: location.lng
    });

    if (error) {
      Alert.alert('Registration Failed', error.message);
    } else {
      Alert.alert('Success', 'Store registered successfully!');
      router.replace('/(owner)/dashboard');
    }
    setLoadingSubmit(false);
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Register Your Store</Text>
      
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Store Name"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Category (e.g. Grocery, Electronics)"
        placeholderTextColor={colors.textSecondary}
        value={category}
        onChangeText={setCategory}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, height: 80 }]}
        placeholder="Full Address"
        placeholderTextColor={colors.textSecondary}
        value={address}
        onChangeText={setAddress}
        multiline
      />

      <View style={[styles.locationBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.textPrimary, marginBottom: 10 }}>
          {location ? `Location Captured: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'No location set'}
        </Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.secondary, width: '100%', marginTop: 0 }]} 
          onPress={handleGetLocation}
          disabled={loadingLoc}
        >
          {loadingLoc ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Capture GPS Location</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={handleRegister} 
        disabled={loadingSubmit}
      >
        {loadingSubmit ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Complete Registration</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, marginBottom: 16 },
  locationBox: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 20, alignItems: 'center' },
  button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});