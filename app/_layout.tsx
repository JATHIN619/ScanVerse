import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useStoreStore } from '../store/storeStore';

export default function RootLayout() {
  const { session, setSession, setProfile, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const segments = useSegments();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
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
    const activeStore = useStoreStore.getState().activeStore;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && profile && inAuthGroup) {
      if (profile.role === 'customer') {
        // If customer has a store selected, go to home. Otherwise, force selection.
        if (activeStore) {
          router.replace('/(customer)/home');
        } else {
          router.replace('/store-selection');
        }
      } else if (profile.role === 'owner') {
        router.replace('/(owner)/dashboard');
      }
    }
  }, [session, isInitializing, segments, useAuthStore.getState().profile, useStoreStore.getState().activeStore]);

  if (isInitializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(owner)" />
      <Stack.Screen name="store-selection" />
    </Stack>
  );
}