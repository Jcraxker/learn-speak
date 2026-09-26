import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { C } from '../theme';

// Voice orb like Gemini/ChatGPT: states idle|listening|thinking|speaking.
// Pulse animation while active. Tap toggles. Seconds shown when listening.
// Props: state, seconds, onPress, disabled
export default function VoiceOrb({ state, seconds, onPress, disabled }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'idle') {
      pulse.setValue(1);
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
  }, [state === 'idle']);

  const bg =
    state === 'listening' ? C.teal : state === 'speaking' ? C.navy : state === 'thinking' ? C.gold : C.navy;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.hit}>
      <Animated.View style={[styles.orb, { backgroundColor: bg, transform: [{ scale: pulse }] }]}>
        <Text style={styles.glyph}>{state === 'listening' ? '●' : state === 'thinking' ? '…' : '◉'}</Text>
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
