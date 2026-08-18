import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function PrimaryButton() {
  return (
    <TouchableOpacity style={styles.button}>
      <Text style={styles.text}>Placeholder Button</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1E8E5A',
    padding: 12,
    borderRadius: 8,
  },
  text: {
    color: '#FFF',
    textAlign: 'center',
  },
});