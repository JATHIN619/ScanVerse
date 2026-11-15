import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

export default function OwnerAccountScreen() {
  const mode = useThemeStore(state => state.mode);
  const toggleTheme = useThemeStore(state => state.toggleTheme);
  const colors = theme.colors[mode];
  
  const user = useAuthStore(state => state.profile);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/'); 
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Owner Account</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 32 }}>{user?.email}</Text>

      <TouchableOpacity 
        style={[styles.menuBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
        onPress={() => router.push('/(owner)/deals')}
      >
        <Ionicons name="pricetag-outline" size={24} color={colors.primary} style={{ marginRight: 16 }} />
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', flex: 1 }}>Manage Deals</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* NEW: Abandoned Items Button */}
      <TouchableOpacity 
        style={[styles.menuBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
        onPress={() => router.push('/(owner)/abandoned')}
      >
        <Ionicons name="cart-outline" size={24} color="#ef4444" style={{ marginRight: 16 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>Abandoned Items</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>View scanned but dropped products</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* RESTORED: Dark Mode Toggle */}
      <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={24} color={colors.textPrimary} style={{ marginRight: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>Dark Mode</Text>
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
        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({ 
  container: { flex: 1, padding: 20, paddingTop: 80 }, 
  title: { fontSize: 32, fontWeight: 'bold' }, 
  menuBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 }, 
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginTop: 'auto', marginBottom: 32 } 
});