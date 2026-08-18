import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { session, setSession, setProfile, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const segments = useSegments();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        // FIX: Use maybeSingle() instead of single() to prevent crash on 0 rows
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentSession.user.id)
          .maybeSingle();
          
        if (data) {
          setProfile(data);
        } else if (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        clearAuth();
      }
      setIsInitializing(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isInitializing) return;

    const inAuthGroup = segments[0] === '(auth)';
    const profile = useAuthStore.getState().profile;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && profile && inAuthGroup) {
      if (profile.role === 'customer') {
        router.replace('/(customer)/home');
      } else if (profile.role === 'owner') {
        router.replace('/(owner)/dashboard');
      }
    }
  }, [session, isInitializing, segments, useAuthStore.getState().profile]);

  if (isInitializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
    </Stack>
  );
}