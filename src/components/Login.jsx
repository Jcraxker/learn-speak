import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, R, T } from '../theme';

// Login screen: Google button + guest fallback (demo never blocks).
// Props: busy, error, canLogin, onLogin, onGuest
export default function Login({ busy, error, canLogin, onLogin, onGuest }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>Learn'Speak</Text>
      <Text style={styles.tag}>Tu profesor de idiomas en el bolsillo</Text>
      <View style={styles.card}>
        <Pressable style={[styles.google, (!canLogin || busy) && styles.dim]} onPress={onLogin} disabled={!canLogin || busy}>
          <Text style={styles.g}>G</Text>
          <Text style={styles.gtext}>{busy ? 'Abriendo Google...' : 'Entrar con Google'}</Text>
        </Pressable>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.guest} onPress={onGuest}>
          <Text style={styles.guestText}>Continuar como invitado</Text>
        </Pressable>
        <Text style={styles.fine}>Gratis: 1 sesión al día. Pro desbloquea todo.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: C.bg, gap: 6 },
  brand: { fontSize: T.title, fontWeight: '800', textAlign: 'center', color: C.ink },
  tag: { textAlign: 'center', color: C.muted, marginBottom: 18, fontSize: T.small },
  card: { gap: 10 },
  google: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, padding: 15 },
  g: { fontSize: 20, fontWeight: '800', color: '#4285F4' },
  gtext: { fontWeight: '700', color: C.ink, fontSize: T.body },
  dim: { opacity: 0.5 },
  error: { color: C.danger, fontSize: T.small, textAlign: 'center' },
  guest: { padding: 13, alignItems: 'center' },
  guestText: { fontWeight: '700', color: C.surface },
  fine: { textAlign: 'center', color: C.muted, fontSize: 12 },
});
