import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C, R, T } from '../theme';
import { buyPackage, getOfferings, isMockMode, restore } from '../lib/monetization';

// Pricing screen modeled on Duolingo/Babbel paywalls:
// benefits first, plan comparison, single CTA, restore + fine print.
// Works in mock (Expo Go demo, no charge) and live (dev build/APK + store keys).
// Props: visible, onClose(plan) where plan is 'pro' | 'minutes' | null.
const BENEFITS = [
  { icon: '∞', title: 'Sesiones ilimitadas', sub: 'Practica 5, 10 o 15 min sin tope diario' },
  { icon: '◉', title: 'Todos los temas y niveles', sub: 'De A1 a C1, 4 temas y los que vengan' },
  { icon: '✓', title: 'Correcciones + nota', sub: 'Feedback con bullets y puntaje 0-100' },
  { icon: '♪', title: 'Voz completa', sub: 'Escucha al profesor y habla con el micrófono' },
];

export default function Paywall({ visible, onClose }) {
  const [packages, setPackages] = useState([]);
  const [mode, setMode] = useState('mock');
  const [selected, setSelected] = useState('monthly');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setDone(null);
    (async () => {
      const res = await getOfferings();
      setMode(res.mode);
      setPackages(res.packages || []);
      const monthly = (res.packages || []).find((p) => p.kind === 'subscription');
      setSelected(monthly ? monthly.id : res.packages?.[0]?.id);
    })();
  }, [visible]);

  const current = packages.find((p) => p.id === selected);

  async function buy() {
    if (!current || busy) return;
    setBusy(true);
    const res = await buyPackage(current);
    setBusy(false);
    if (res.ok) {
      setDone(current.kind === 'subscription' ? 'pro' : 'minutes');
      setTimeout(() => onClose(current.kind === 'subscription' ? 'pro' : 'minutes', res), 900);
    }
  }

  async function onRestore() {
    const res = await restore();
    if (res.ok && res.pro) onClose('pro', res);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.kicker}>LEARN'SPEAK PRO</Text>
            <Text style={styles.title}>Habla sin límites</Text>
            {BENEFITS.map((b) => (
              <View key={b.title} style={styles.benefit}>
                <Text style={styles.icon}>{b.icon}</Text>
                <View style={styles.btext}>
                  <Text style={styles.btitle}>{b.title}</Text>
                  <Text style={styles.bsub}>{b.sub}</Text>
                </View>
              </View>
            ))}
            <View style={styles.plans}>
              {packages.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.plan, selected === p.id && styles.planOn]}
                  onPress={() => setSelected(p.id)}
                >
                  {p.kind === 'subscription' && <Text style={styles.pop}>MÁS POPULAR</Text>}
                  <Text style={[styles.pname, selected === p.id && styles.pnameOn]}>
                    {p.kind === 'subscription' ? 'Pro mensual' : 'Pack 60 min'}
                  </Text>
                  <Text style={[styles.pprice, selected === p.id && styles.pnameOn]}>{p.price}</Text>
                  <Text style={[styles.pdesc, selected === p.id && styles.pdescOn]}>
                    {p.kind === 'subscription' ? 'Sesiones ilimitadas, cancela cuando quieras' : '60 minutos extra, pago único'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {mode === 'mock' && (
              <Text style={styles.mock}>Modo demo — no se cobra nada real.</Text>
            )}
          </ScrollView>
          <Pressable style={styles.cta} disabled={busy || !current} onPress={buy}>
            <Text style={styles.ctaText}>
              {done ? '✓ Listo, a practicar' : busy ? 'Procesando pago...' : `Continuar — ${current?.price ?? ''}`}
            </Text>
          </Pressable>
          <View style={styles.links}>
            <Pressable onPress={onRestore}>
              <Text style={styles.link}>Restaurar compras</Text>
            </Pressable>
            <Pressable onPress={() => onClose(null)}>
              <Text style={styles.link}>Ahora no</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(19,19,23,0.55)', justifyContent: 'flex-end' },
  card: { backgroundColor: C.bg, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, paddingTop: 20, maxHeight: '92%' },
  scroll: { paddingHorizontal: 22, gap: 10, paddingBottom: 8 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: C.surface },
  title: { fontSize: 26, fontWeight: '800', color: C.ink, marginBottom: 4 },
  benefit: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 4 },
  icon: { width: 36, height: 36, textAlign: 'center', textAlignVertical: 'center', borderRadius: 18, backgroundColor: C.primary, fontWeight: '800', color: C.ink, fontSize: 16 },
  btext: { flex: 1 },
  btitle: { fontWeight: '700', color: C.ink, fontSize: T.body },
  bsub: { color: C.muted, fontSize: T.small },
  plans: { gap: 8, marginTop: 6 },
  plan: { borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, padding: 13, backgroundColor: C.soft },
  planOn: { borderColor: C.ink, backgroundColor: C.ink },
  pop: { alignSelf: 'flex-start', fontSize: 10, fontWeight: '800', letterSpacing: 1, backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 5 },
  pname: { fontWeight: '800', color: C.ink, fontSize: T.body },
  pnameOn: { color: '#fff' },
  pprice: { fontWeight: '800', color: C.ink, fontSize: T.h, marginTop: 2 },
  pdesc: { color: C.muted, fontSize: T.small, marginTop: 2 },
  pdescOn: { color: '#c2c1ff' },
  mock: { fontSize: 12, color: C.muted, fontStyle: 'italic', textAlign: 'center' },
  cta: { backgroundColor: C.ink, marginHorizontal: 22, marginTop: 8, borderRadius: R.md, padding: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  links: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 12 },
  link: { color: C.muted, fontWeight: '600', fontSize: T.small },
});
