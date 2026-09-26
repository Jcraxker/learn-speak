import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function fmt(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Props: duracionMin (5|10|15), onTerminar()
// Shows MM:SS, locks at 0 and calls onTerminar once.
export default function SessionBar({ duracionMin, onTerminar }) {
  const [restantes, setRestantes] = useState(duracionMin * 60);
  const done = useRef(false);

  useEffect(() => {
    setRestantes(duracionMin * 60);
    done.current = false;
  }, [duracionMin]);

  useEffect(() => {
    const id = setInterval(() => {
      setRestantes((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!done.current) {
            done.current = true;
            onTerminar?.();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [duracionMin]);

  return (
    <View style={styles.bar}>
      <Text style={[styles.time, restantes <= 60 && styles.urgent]}>{fmt(restantes)}</Text>
      <Pressable style={styles.end} onPress={() => { if (!done.current) { done.current = true; onTerminar?.(); } }}>
        <Text style={styles.endText}>Terminar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  time: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  urgent: { color: '#c00' },
  end: { borderWidth: 1, borderColor: '#c00', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  endText: { color: '#c00', fontWeight: '600' },
});
