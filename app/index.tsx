import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function RootIndex() {
  const session = useAuthStore(state => state.session);
  const profile = useAuthStore(state => state.profile);

  // If Zustand hasn't hydrated yet, you might want to show a spinner.
  // But for an instant redirect based on current state:
  
  if (!session || !profile) {
    // Not logged in -> send to Auth
    return <Redirect href="/(auth)/login" />;
  }

  if (profile.role === 'owner') {
    // Logged in as Owner -> send to Dashboard
    return <Redirect href="/(owner)/dashboard" />;
  }

  // Logged in as Customer -> send to Home
  return <Redirect href="/(customer)/home" />;
}