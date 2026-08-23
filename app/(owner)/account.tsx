import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';

export default function OwnerAccountScreen() {
  const user = useAuthStore(state => state.profile);
  const { mode, toggleTheme } = useThemeStore();
  const colors = theme.colors[mode];

  async function handleLogout() {
    await supabase.auth.signOut();
    useAuthStore.getState().clearAuth(); 
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Owner Account</Text>
      
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>{user?.name}</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>{user?.email}</Text>
        <Text style={{ color: colors.textSecondary, textTransform: 'capitalize' }}>Role: {user?.role}</Text>
      </View>

      <View style={[styles.switchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.actionText, { color: colors.textPrimary }]}>
          {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </Text>
        <Switch
          value={mode === 'dark'}
          onValueChange={toggleTheme}
          trackColor={{ false: '#D1D5DB', true: colors.primary }}
          thumbColor={'#FFFFFF'}
        />
      </View>

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
  actionText: { fontSize: 16, fontWeight: 'bold' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 56, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, marginBottom: 24 }
});