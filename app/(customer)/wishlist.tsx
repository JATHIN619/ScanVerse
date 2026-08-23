import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function WishlistScreen() {
  const { mode } = useThemeStore();
  const colors = theme.colors[mode];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>My Wishlist</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconRing, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="heart" size={64} color={colors.primary} />
        </View>
        
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Coming Soon</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          We are currently building the ability to save your favorite products for later. Check back in the next update!
        </Text>

        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(customer)/home')}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
  header: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  iconRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  subtext: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20, marginBottom: 32 },
  btn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, elevation: 2 }
});