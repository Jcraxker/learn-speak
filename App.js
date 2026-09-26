import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Placeholder scaffold — chat, setup and session come in next PRs.
// This file only proves Expo boots on Expo Go; no features claimed.
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LearnSpeak</Text>
      <Text>Scaffold OK — Expo boots. Next: Setup + Chat + Session.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
});
