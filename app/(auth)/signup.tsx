import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'owner'>('customer');
  const [loading, setLoading] = useState(false);
  
  const mode = useThemeStore((state) => state.mode);
  const colors = theme.colors[mode];

  async function handleSignup() {
    if (!name || !email || !password) return Alert.alert('Error', 'Please fill all fields');
    setLoading(true);

    const cleanEmail = email.replace(/\s+/g, '').toLowerCase();
    const cleanName = name.trim();

    const { data: authData, error: authError } = await supabase.auth.signUp({ 
      email: cleanEmail, 
      password 
    });
    
    if (authError) {
      setLoading(false);
      return Alert.alert('Signup Failed', authError.message);
    }

    if (authData.user) {
      const { error: dbError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: cleanEmail,
        name: cleanName,
        role
      });

      if (dbError) {
        Alert.alert('Database Error', dbError.message);
      } else {
        // FIX: Manually inject the profile into Zustand to unblock the router
        useAuthStore.getState().setProfile({
          id: authData.user.id,
          email: cleanEmail,
          name: cleanName,
          role
        });
        Alert.alert('Success', 'Account created successfully!');
      }
    }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
      
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Full Name"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
        autoCorrect={false}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={{ color: colors.textPrimary, marginBottom: 10, marginTop: 10 }}>Select Role:</Text>
      <View style={styles.roleContainer}>
        <TouchableOpacity 
          style={[styles.roleButton, role === 'customer' ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => setRole('customer')}
        >
          <Text style={{ color: role === 'customer' ? '#FFF' : colors.textPrimary }}>Customer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.roleButton, role === 'owner' ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => setRole('owner')}
        >
          <Text style={{ color: role === 'owner' ? '#FFF' : colors.textPrimary }}>Store Owner</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={handleSignup} 
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
        <Text style={{ color: colors.secondary, textAlign: 'center' }}>Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: { height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, marginBottom: 16 },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleButton: { flex: 1, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});