import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useStoreStore } from '../../store/storeStore';
import { theme } from '../../constants/theme';

export default function AccountScreen() {
  const user = useAuthStore(state => state.profile);
  const activeStore = useStoreStore(state => state.activeStore);
  const clearActiveStore = useStoreStore(state => state.clearActiveStore);
  
  const { mode, toggleTheme } = useThemeStore();
  const colors = theme.colors[mode];

  async function handleLogout() {
    await supabase.auth.signOut();
    useAuthStore.getState().clearAuth();
    clearActiveStore(); // Wipe the store choice on logout
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Account</Text>
      
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>{user?.name}</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>{user?.email}</Text>
        <Text style={{ color: colors.textSecondary, textTransform: 'capitalize' }}>Role: {user?.role}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Shopping at:</Text>
        <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
          {activeStore ? activeStore.name : 'No store selected'}
        </Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.secondary, height: 40 }]} 
          onPress={() => router.push('/store-selection')}
        >
          <Text style={styles.buttonText}>Change Store</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary, marginBottom: 16 }]} 
        onPress={toggleTheme}
      >
        <Text style={styles.buttonText}>Toggle Theme</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.error }]} 
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 24 },
  button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});