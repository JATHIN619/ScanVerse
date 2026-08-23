import { Tabs, router } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';

function CustomScanButton({ onPress }: { onPress: () => void }) {
  const mode = useThemeStore((state) => state.mode);
  const colors = theme.colors[mode];

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={onPress} 
      style={[styles.scanButtonContainer, { backgroundColor: colors.background }]}
    >
      <View style={[styles.scanButton, { backgroundColor: colors.primary }]}>
        <Ionicons name="scan" size={28} color="#FFF" />
      </View>
    </TouchableOpacity>
  );
}

export default function CustomerTabLayout() {
  const mode = useThemeStore((state) => state.mode);
  const colors = theme.colors[mode];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarButton: (props) => (
            <CustomScanButton onPress={() => router.push('/(customer)/scan')} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />,
        }}
      />
      
      {/* Hidden Screens */}
      <Tabs.Screen 
        name="checkout" 
        options={{ href: null, tabBarStyle: { display: 'none' } }} 
      />
      <Tabs.Screen 
        name="orders" 
        options={{ href: null, tabBarStyle: { display: 'none' } }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});