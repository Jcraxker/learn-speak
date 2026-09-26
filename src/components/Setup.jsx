import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C, T } from '../theme';
import { canStartFree } from '../lib/freelimit';

const DIRECCIONES = [
  { id: 'en-es', label: 'EN → ES' },
  { id: 'es-en', label: 'ES → EN' },
];
const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1'];
const TEMAS = [
  { id: 'viajes', label: 'Travel stories', sub: 'Share places you want to explore' },
  { id: 'musica', label: 'Music talk', sub: 'Bands and songs you love' },
  { id: 'tech', label: 'Technology', sub: 'Gadgets, apps and AI' },
  { id: 'futbol', label: 'Football', sub: 'Matches, players, goals' },
];
const DURACIONES = [
  { min: 5, tag: 'Quick' },
  { min: 10, tag: 'Focus' },
  { min: 15, tag: 'Deep' },
];

// Props: onStart({ direccion, nivel, tema, duracionMin, voice })
export default function Setup({ onStart }) {
  const [direccion, setDireccion] = useState('en-es');
  const [nivel, setNivel] = useState('B1');
  const [tema, setTema] = useState('viajes');
  const [duracionMin, setDuracionMin] = useState(10);
  const [voice, setVoice] = useState(true);
  const [free, setFree] = useState(true);
  useEffect(() => {
    (async () => setFree(await canStartFree()))();
  }, []);
  const temaSel = TEMAS.find((t) => t.id === tema);

  return (
    <ScrollView contentContainerStyle={st.wrap}>
      <Text style={st.eyebrow}>START A SESSION</Text>
      <Text style={st.h1}>Conversation{'\n'}setup.</Text>
      <Text style={st.label}>DIRECTION</Text>
      <View style={st.row}>
        {DIRECCIONES.map((d) => (
          <Pressable key={d.id} style={[st.chip, direccion === d.id && st.on]} onPress={() => setDireccion(d.id)}>
            <Text style={[st.chipT, direccion === d.id && st.onT]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={st.label}>LEVEL</Text>
      <View style={st.row}>
        {NIVELES.map((n) => (
          <Pressable key={n} style={[st.chip, nivel === n && st.on]} onPress={() => setNivel(n)}>
            <Text style={[st.chipT, nivel === n && st.onT]}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={st.topic}>
        <Text style={st.spark}>✦</Text>
        <View style={st.topicBody}>
          <Text style={st.eyebrow}>TOPIC</Text>
          <Text style={st.topicT}>{temaSel.label}</Text>
          <Text style={st.topicS}>{temaSel.sub}</Text>
        </View>
      </View>
      <View style={st.row}>
        {TEMAS.map((t) => (
          <Pressable key={t.id} style={[st.chip, tema === t.id && st.tealOn]} onPress={() => setTema(t.id)}>
            <Text style={[st.chipT, tema === t.id && st.tealOnT]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={st.label}>HOW LONG WOULD YOU LIKE TO SPEAK?</Text>
      <View style={st.row}>
        {DURACIONES.map((d) => (
          <Pressable key={d.min} style={[st.dur, duracionMin === d.min && st.on]} onPress={() => setDuracionMin(d.min)}>
            <Text style={[st.durT, duracionMin === d.min && st.onT]}>{d.min} min</Text>
            <Text style={[st.durS, duracionMin === d.min && st.onT]}>{d.tag}</Text>
          </Pressable>
        ))}
      </View>
      <View style={st.free}>
        <View>
          <Text style={st.freeN}>{free ? '1 / 1' : '0 / 1'}</Text>
          <Text style={st.freeT}>Free conversations available</Text>
        </View>
        <Text style={st.freeS}>✦</Text>
      </View>
      <Text style={st.label}>PRACTICE MODE</Text>
      <View style={st.row}>
        <Pressable style={[st.mode, voice && st.modeOn]} onPress={() => setVoice(true)}>
          <Text style={[st.modeT, voice && st.modeOnT]}>● Live speaking</Text>
        </Pressable>
        <Pressable style={[st.mode, !voice && st.modeOn]} onPress={() => setVoice(false)}>
          <Text style={[st.modeT, !voice && st.modeOnT]}>Writing</Text>
        </Pressable>
      </View>
      <Pressable style={st.go} onPress={() => onStart({ direccion, nivel, tema, duracionMin, voice })}>
        <Text style={st.goT}>Start {duracionMin} min conversation →</Text>
      </Pressable>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, gap: 8, backgroundColor: C.paper, flexGrow: 1 },
  eyebrow: { fontSize: T.eyebrow, letterSpacing: 1, color: C.muted, fontWeight: '600' },
  h1: { fontSize: 30, fontWeight: '800', color: C.navy, lineHeight: 32, marginBottom: 6 },
  label: { fontSize: T.eyebrow, letterSpacing: 1, color: C.ink, fontWeight: '700', marginTop: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 15 },
  on: { backgroundColor: C.navy, borderColor: C.navy },
  chipT: { fontWeight: '600', color: C.muted, fontSize: 13 },
  onT: { color: '#fff' },
  tealOn: { backgroundColor: C.tealPale, borderColor: C.teal },
  tealOnT: { color: '#176c68', fontWeight: '700' },
  topic: { borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', borderRadius: 16, padding: 13, flexDirection: 'row', gap: 11, alignItems: 'center' },
  spark: { width: 37, height: 37, textAlign: 'center', textAlignVertical: 'center', borderRadius: 11, backgroundColor: '#e8f0f6', color: C.blue, fontSize: 18 },
  topicBody: { flex: 1 },
  topicT: { fontSize: 13, fontWeight: '800' },
  topicS: { fontSize: 10, color: C.muted },
  dur: { flex: 1, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff', borderRadius: 13, paddingVertical: 10, alignItems: 'center' },
  durT: { fontWeight: '700', color: C.muted, fontSize: 13 },
  durS: { fontSize: 9, color: C.muted },
  free: { borderRadius: 16, backgroundColor: C.goldPale, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  freeN: { fontSize: 22, fontWeight: '800', color: '#936920' },
  freeT: { fontSize: 11, fontWeight: '700' },
  freeS: { fontSize: 22, color: '#ad7c2d' },
  mode: { flex: 1, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff', borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  modeOn: { backgroundColor: C.tealPale, borderColor: C.teal },
  modeT: { fontWeight: '600', color: C.muted, fontSize: 12 },
  modeOnT: { color: '#176c68', fontWeight: '700' },
  go: { backgroundColor: C.navy, borderRadius: 15, padding: 16, alignItems: 'center', marginTop: 16, marginBottom: 10 },
  goT: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
