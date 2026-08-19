import { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';

export default function Dashboard() {
  const user = useAuthStore(state => state.profile);
  const { mode, toggleTheme } = useThemeStore();
  const colors = theme.colors[mode];
  const [checking, setChecking] = useState(true);

  // useFocusEffect runs every time this tab comes into view, ensuring it never gets stuck
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function checkStore() {
        if (!user) return;
        setChecking(true); // Reset to loading state when focused
        
        const { data, error } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (!isActive) return;

        if (!data) {
          router.replace('/(owner)/register-store');
        } else {
          setChecking(false);
        }
      }

      checkStore();

      return () => {
        isActive = false;
      };
    }, [user])
  );

  if (checking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Owner Dashboard</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 20 }}>Store ID loaded.</Text>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={toggleTheme}
      >
        <Text style={styles.buttonText}>Toggle Theme</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  button: { padding: 12, borderRadius: 8, marginTop: 10 },
  buttonText: { color: '#FFF', fontWeight: 'bold' }
});