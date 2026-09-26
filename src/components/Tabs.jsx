import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, T } from '../theme';
import { getStats } from '../lib/stats';
import { canStartFree } from '../lib/freelimit';

// Tabs: home | practice | progress | profile
const TAB_ICON = { home: 'home', practice: 'bulb', progress: 'stats-chart', profile: 'person' };
export default function Tabs({ tab, setTab }) {
  const items = [
    ['home', 'Home'],
    ['practice', 'Practice'],
    ['progress', 'Progress'],
    ['profile', 'Profile'],
  ];
  return (
    <View style={styles.nav}>
      {items.map(([id, label]) => (
        <Pressable key={id} style={styles.btn} onPress={() => setTab(id)}>
          <Ionicons name={TAB_ICON[id]} size={22} color={tab === id ? C.navy : '#b9c4cd'} />
          <Text style={[styles.label, tab === id && styles.labelOn]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 18, backgroundColor: '#fff', borderTopWidth: 1, borderColor: C.line },
  btn: { width: 64, alignItems: 'center', gap: 3 },
  label: { fontSize: 10, color: C.muted },
  labelOn: { color: C.navy, fontWeight: '700' },
});

// ---- HOME ----
export function Home({ user, goPractice, openPaywall, pro }) {
  const [stats, setStats] = useState({ sessions: 0, minutes: 0, log: [], max: 1 });
  const [free, setFree] = useState(true);
  useEffect(() => {
    (async () => {
      setStats(await getStats());
      setFree(await canStartFree());
    })();
  }, []);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  return (
    <View style={h.wrap}>
      <View style={h.head}>
        <View>
          <Text style={h.eyebrow}>{greet}</Text>
          <Text style={h.h1}>Learn with{'\n'}confidence.</Text>
        </View>
        <View style={h.avatar}>
          <Text style={h.avatarT}>{(user?.name || 'G').slice(0, 1).toUpperCase()}</Text>
        </View>
      </View>
      <View style={h.hero}>
        <View style={h.heroL}>
          <Text style={h.ready}>● AI TUTOR READY</Text>
          <Text style={h.heroT}>Ready to{'\n'}practice?</Text>
          <Text style={h.heroP}>Have a natural conversation with your AI tutor.</Text>
          <Pressable style={h.start} onPress={() => goPractice()}>
            <Text style={h.startT}>Start speaking </Text>
            <Ionicons name="arrow-forward" size={14} color={C.navy} />
          </Pressable>
        </View>
        <View style={h.orb}>
          <View style={h.orbIn} />
        </View>
      </View>
      <Pressable style={h.trial} onPress={openPaywall}>
        <View>
          <Text style={h.eyebrow2}>FREE PRACTICE</Text>
          <Text style={h.trialB}>{pro ? 'Pro active' : free ? '1 / 1 available' : '0 / 1 — upgrade'}</Text>
        </View>
        <View style={h.slots}>
          {['5', '10', '15'].map((m) => (
            <View key={m} style={h.slot}>
              <View style={h.slotDot} />
              <Text style={h.slotT}>{m} min</Text>
            </View>
          ))}
        </View>
      </Pressable>
      <View style={h.score}>
        <View>
          <Text style={h.eyebrow2}>WEEKLY SPEAKING</Text>
          <Text style={h.big}>{stats.minutes}<Text style={h.bigS}> min</Text></Text>
          <Text style={h.sub}>{stats.sessions} sessions</Text>
        </View>
        <View style={h.chart}>
          {(stats.log.length ? stats.log : [{ min: 0 }]).slice(-7).map((d, i, a) => (
            <View key={i} style={[h.bar, { height: Math.max(6, (d.min / stats.max) * 60) }, i === a.length - 1 && d.min > 0 && h.hot]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper, padding: 20, gap: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: T.eyebrow, letterSpacing: 1, color: C.muted, fontWeight: '600' },
  h1: { fontSize: 30, fontWeight: '800', color: C.navy, lineHeight: 32, marginTop: 4 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  avatarT: { color: '#fff', fontWeight: '700' },
  hero: { borderRadius: 22, backgroundColor: C.navy, padding: 22, flexDirection: 'row', overflow: 'hidden' },
  heroL: { flex: 1, gap: 8 },
  ready: { fontSize: 9, letterSpacing: 1, color: '#a9d7d2', fontWeight: '600' },
  heroT: { fontSize: 30, fontWeight: '800', color: '#fff', lineHeight: 32 },
  heroP: { fontSize: 12, color: '#d6e5ee', lineHeight: 17 },
  start: { backgroundColor: '#fff', borderRadius: 23, paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 6, flexDirection: 'row', alignItems: 'center' },
  startT: { color: C.navy, fontWeight: '700', fontSize: 12 },
  orb: { width: 90, height: 90, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  orbIn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2a8c87', borderWidth: 3, borderColor: '#71c8bd' },
  trial: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow2: { fontSize: 9, letterSpacing: 1, color: C.muted, fontWeight: '600' },
  trialB: { fontWeight: '700', fontSize: 12, marginTop: 4, color: C.ink },
  slots: { flexDirection: 'row', gap: 8 },
  slot: { alignItems: 'center' },
  slotDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.teal, marginBottom: 3 },
  slotT: { fontSize: 8, color: C.muted },
  score: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center' },
  big: { fontSize: 28, fontWeight: '800', color: C.navy },
  bigS: { fontSize: 11, fontWeight: '400' },
  sub: { fontSize: 10, color: C.teal },
  chart: { height: 60, flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginLeft: 'auto' },
  bar: { width: 8, backgroundColor: '#dce8ef', borderRadius: 4 },
  hot: { backgroundColor: C.gold },
});
