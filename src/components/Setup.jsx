import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.wrap}>
      <Text style={styles.title}>LearnSpeak</Text>
      <Text style={styles.h}>Direccion</Text>
      <Row>
        {DIRECCIONES.map((d) => (
          <Chip key={d.id} label={d.label} active={direccion === d.id} onPress={() => setDireccion(d.id)} />
        ))}
      </Row>
      <Text style={styles.h}>Nivel</Text>
      <Row>
        {NIVELES.map((n) => (
          <Chip key={n} label={n} active={nivel === n} onPress={() => setNivel(n)} />
        ))}
      </Row>
      <Text style={styles.h}>Tema</Text>
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
    </View>
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
  wrap: { flex: 1, padding: 20, gap: 8, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  h: { fontSize: 13, fontWeight: '600', opacity: 0.6, marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#131317', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: '#131317' },
  chipText: { fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  go: { backgroundColor: '#131317', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  goText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
