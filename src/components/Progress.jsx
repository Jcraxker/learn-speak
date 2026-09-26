import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, T } from '../theme';
import { getStats } from '../lib/stats';

// Real local data: sessions, minutes, 7-day bars, avg score.
export default function Progress({ openPaywall, pro }) {
  const [s, setS] = useState({ sessions: 0, minutes: 0, log: [], max: 1, avg: 0 });
  useEffect(() => {
    (async () => setS(await getStats()))();
  }, []);
  return (
    <View style={st.wrap}>
      <Text style={st.eyebrow}>YOUR LEARNING</Text>
      <Text style={st.h1}>Progress,{'\n'}in motion.</Text>
      <View style={st.overall}>
        <Text style={st.ospan}>OVERALL SPEAKING SCORE</Text>
        <Text style={st.obig}>{s.avg || '—'}{s.avg ? <Text style={st.osmall}> / 100</Text> : null}</Text>
        <Text style={st.op}>{s.sessions} sessions · {s.minutes} min total</Text>
        <View style={st.bars}>
          {(s.log.length ? s.log : [{ min: 0 }]).slice(-7).map((d, i) => (
            <View key={i} style={[st.bar, { height: Math.max(8, (d.min / s.max) * 60) }]} />
          ))}
        </View>
      </View>
      <View style={st.grid}>
        <View style={st.cell}>
          <Text style={st.num}>{s.sessions}</Text>
          <Text style={st.lbl}>Sessions</Text>
        </View>
        <View style={st.cell}>
          <Text style={st.num}>{s.minutes}m</Text>
          <Text style={st.lbl}>Practice time</Text>
        </View>
      </View>
      {!pro && (
        <Pressable style={st.tokens} onPress={openPaywall}>
          <Text style={st.eyebrow}>FREE PLAN</Text>
          <Text style={st.tb}>1 session / day</Text>
          <Text style={st.tp}>Upgrade plan →</Text>
        </Pressable>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper, padding: 20, gap: 12 },
  eyebrow: { fontSize: T.eyebrow, letterSpacing: 1, color: C.muted, fontWeight: '600' },
  h1: { fontSize: 30, fontWeight: '800', color: C.navy, lineHeight: 32 },
  overall: { backgroundColor: C.navy, borderRadius: 20, padding: 18 },
  ospan: { fontSize: 9, letterSpacing: 1, color: '#bcd0df', fontWeight: '600' },
  obig: { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 4 },
  osmall: { fontSize: 12, fontWeight: '400' },
  op: { fontSize: 10, color: '#78d2c6', marginTop: 2 },
  bars: { height: 60, flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 12 },
  bar: { width: 14, backgroundColor: '#6d9abf', borderRadius: 6 },
  grid: { flexDirection: 'row', gap: 9 },
  cell: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 13 },
  num: { fontSize: 22, fontWeight: '800', color: C.navy },
  lbl: { fontSize: 10, color: C.muted, marginTop: 2 },
  tokens: { backgroundColor: C.goldPale, borderRadius: 16, padding: 15 },
  tb: { fontSize: 17, fontWeight: '800', color: '#765a28', marginTop: 4 },
  tp: { fontSize: 11, fontWeight: '700', color: '#946e2a', marginTop: 4 },
});
