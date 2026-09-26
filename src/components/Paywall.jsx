import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { buyPackage, getOfferings, isMockMode, restore } from '../lib/monetization';

// Simple custom paywall. Works in mock (Expo Go) and live (dev build/APK).
// Props: visible, onClose(plan) where plan is 'pro' | 'minutes' | null.
export default function Paywall({ visible, onClose }) {
  const [packages, setPackages] = useState([]);
  const [mode, setMode] = useState('mock');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const res = await getOfferings();
      setMode(res.mode);
      setPackages(res.packages || []);
    })();
  }, [visible]);

  async function buy(pkg) {
    setBusy(pkg.id);
    const res = await buyPackage(pkg);
    setBusy(null);
    if (res.ok) onClose(pkg.kind === 'subscription' ? 'pro' : 'minutes', res);
  }

  async function onRestore() {
    const res = await restore();
    if (res.ok && res.pro) onClose('pro', res);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>LearnSpeak Pro</Text>
          <Text style={styles.sub}>
            Free: 1 sesion/dia. Pro: sesiones ilimitadas + todos los temas.
          </Text>
          {mode === 'mock' && (
            <Text style={styles.mock}>Modo demo (Expo Go) — sin cobro real.</Text>
          )}
          {packages.map((p) => (
            <Pressable
              key={p.id}
              style={styles.buy}
              disabled={busy !== null}
              onPress={() => buy(p)}
            >
              <Text style={styles.buyText}>
                {busy === p.id ? 'Procesando...' : `${p.title} — ${p.price}`}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.link} onPress={onRestore}>
            <Text>Restaurar compras</Text>
          </Pressable>
          <Pressable style={styles.link} onPress={() => onClose(null)}>
            <Text>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 14, opacity: 0.8 },
  mock: { fontSize: 12, opacity: 0.6, fontStyle: 'italic' },
  buy: { backgroundColor: '#131317', padding: 14, borderRadius: 10, alignItems: 'center' },
  buyText: { color: '#fff', fontWeight: '600' },
  link: { padding: 10, alignItems: 'center' },
});
