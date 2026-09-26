import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

// Voice orb: idle|listening|thinking|speaking. Pulse when thinking/speaking,
// breathes with live mic level when listening. Tap toggles.
// Props: state, seconds, level (0..1 mic energy), onPress, disabled
export default function VoiceOrb({ state, seconds, level = 0, onPress, disabled }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'idle' || state === 'listening') {
      if (state === 'idle') pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state]);

  useEffect(() => {
    if (state === 'listening') {
      pulse.setValue(1 + Math.min(1, Math.max(0, level)) * 0.4);
    }
  }, [level]);

  const bg =
    state === 'listening' ? C.teal : state === 'speaking' ? C.navy : state === 'thinking' ? C.gold : C.navy;

  const glyph =
    state === 'listening' ? 'stop' : state === 'thinking' ? 'hourglass' : state === 'speaking' ? 'volume-high' : 'mic';

  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.hit}>
      <Animated.View style={[styles.orb, { backgroundColor: bg, transform: [{ scale: pulse }] }]}>
        <Ionicons name={glyph} size={26} color="#fff" />
        {state === 'listening' && <Text style={styles.secs}>{seconds}s</Text>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  orb: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  glyph: { color: '#fff', fontSize: 22, fontWeight: '800' },
  secs: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
