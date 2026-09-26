import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Paywall from './src/components/Paywall';
import { initMonetization, isMockMode, isPro } from './src/lib/monetization';

// Scaffold + monetization entry. Chat/Setup/Session come in next PRs.
// RevenueCat inits here once; Expo Go runs in mock mode by design.
export default function App() {
  const [mode, setMode] = useState('...');
  const [pro, setPro] = useState(false);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await initMonetization();
      setMode(res.mode);
      setPro(await isPro());
    })();
  }, []);

  async function onPaywallClose(plan, res) {
    setPaywall(false);
    if (plan && res?.ok) setPro(plan === 'pro' ? true : await isPro());
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LearnSpeak</Text>
      <Text>Scaffold OK — Expo boots. Next: Setup + Chat + Session.</Text>
      <Text style={styles.badge}>
        Plan: {pro ? 'Pro' : 'Free'} · Pagos: {isMockMode() ? `demo (${mode})` : 'live'}
      </Text>
      {!pro && (
        <Pressable style={styles.cta} onPress={() => setPaywall(true)}>
          <Text style={styles.ctaText}>Ver Pro / minutos extra</Text>
        </Pressable>
      )}
      <Paywall visible={paywall} onClose={onPaywallClose} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  badge: { fontSize: 13, opacity: 0.7 },
  cta: { backgroundColor: '#131317', padding: 12, borderRadius: 10, marginTop: 8 },
  ctaText: { color: '#fff', fontWeight: '600' },
});
