import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, R, T } from '../theme';
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
  backdrop: { flex: 1, backgroundColor: 'rgba(19,19,23,0.55)', justifyContent: 'flex-end' },
  card: { backgroundColor: C.bg, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, padding: 22, gap: 10 },
  title: { fontSize: T.h, fontWeight: '800', color: C.ink },
  sub: { fontSize: T.body, color: C.muted, lineHeight: 21 },
  mock: { fontSize: 12, color: C.muted, fontStyle: 'italic' },
  buy: { backgroundColor: C.ink, padding: 15, borderRadius: R.md, alignItems: 'center' },
  buyText: { color: '#fff', fontWeight: '700', fontSize: T.body },
  link: { padding: 10, alignItems: 'center' },
});
