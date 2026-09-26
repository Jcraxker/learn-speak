import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C, R, T } from '../theme';

const DIRECCIONES = [
  { id: 'en-es', label: 'EN → ES' },
  { id: 'es-en', label: 'ES → EN' },
];
const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1'];
const TEMAS = ['viajes', 'musica', 'tech', 'futbol'];
const DURACIONES = [5, 10, 15];

// Props: onStart({ direccion, nivel, tema, duracionMin })
export default function Setup({ onStart }) {
  const [direccion, setDireccion] = useState('en-es');
  const [nivel, setNivel] = useState('B1');
  const [tema, setTema] = useState('viajes');
  const [duracionMin, setDuracionMin] = useState(5);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.brand}>Learn'Speak</Text>
      <Text style={styles.tag}>Tu profesor de idiomas en el bolsillo</Text>
      <Text style={styles.h}>Direccion</Text>
      <Row>
        {DIRECCIONES.map((d) => (
          <Chip key={d.id} label={d.label} active={direccion === d.id} onPress={() => setDireccion(d.id)} />
        ))}
      </Row>
      <Text style={styles.h}>Tu nivel</Text>
      <Row>
        {NIVELES.map((n) => (
          <Chip key={n} label={n} active={nivel === n} onPress={() => setNivel(n)} />
        ))}
      </Row>
      <Text style={styles.h}>Tema de hoy</Text>
      <Row>
        {TEMAS.map((t) => (
          <Chip key={t} label={t} active={tema === t} onPress={() => setTema(t)} />
        ))}
      </Row>
      <Text style={styles.h}>Duracion (min)</Text>
      <Row>
        {DURACIONES.map((m) => (
          <Chip key={m} label={`${m}`} active={duracionMin === m} onPress={() => setDuracionMin(m)} />
        ))}
      </Row>
      <Pressable
        style={styles.go}
        onPress={() => onStart({ direccion, nivel, tema, duracionMin })}
      >
        <Text style={styles.goText}>COMENZAR</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ children }) {
  return <View style={styles.row}>{children}</View>;
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 8, justifyContent: 'center', flexGrow: 1, backgroundColor: C.bg },
  brand: { fontSize: T.title, fontWeight: '800', textAlign: 'center', color: C.ink },
  tag: { textAlign: 'center', color: C.muted, marginBottom: 10, fontSize: T.small },
  h: { fontSize: T.small, fontWeight: '700', color: C.muted, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.line, backgroundColor: C.soft, borderRadius: R.pill, paddingVertical: 9, paddingHorizontal: 15 },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontWeight: '600', color: C.ink, fontSize: T.body },
  chipTextOn: { color: '#fff' },
  go: { backgroundColor: C.ink, borderRadius: R.md, padding: 16, alignItems: 'center', marginTop: 18 },
  goText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
});
