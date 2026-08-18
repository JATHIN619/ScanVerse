import { View, Text, StyleSheet, Button } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { theme } from '../../constants/theme';

export default function PlaceholderScreen() {
  const { mode, toggleTheme } = useThemeStore();
  const colors = theme.colors[mode];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.textPrimary }]}>Home Screen</Text>
      <Button title={`Toggle Theme (Current: ${mode})`} onPress={toggleTheme} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
});