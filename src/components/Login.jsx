import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, T } from '../theme';

// Login per diseno: marca + bienvenida + Google + invitado.
// Props: busy, error, canLogin, onLogin, onGuest
export default function Login({ busy, error, canLogin, onLogin, onGuest }) {
  return (
    <View style={st.wrap}>
      <View style={st.brand}>
        <View style={st.mark}>
          <Text style={st.markT}>LS</Text>
        </View>
        <Text style={st.brandT}>LearnSpeak</Text>
      </View>
      <Text style={st.eyebrow}>CONTINUA TU PRACTICA</Text>
      <Text style={st.h1}>Bienvenido{'\n'}de nuevo.</Text>
      <Text style={st.sub}>Inicia sesion para continuar aprendiendo con LearnSpeak.</Text>
      <Pressable style={[st.google, (!canLogin || busy) && st.dim]} onPress={onLogin} disabled={!canLogin || busy}>
        <Text style={st.g}>G</Text>
        <Text style={st.gtext}>{busy ? 'Abriendo Google...' : 'Continuar con Google'}</Text>
      </Pressable>
      {!!error && <Text style={st.error}>{error}</Text>}
      <View style={st.div}>
        <Text style={st.divT}>O continua con</Text>
      </View>
      <Pressable style={st.guest} onPress={onGuest}>
        <Text style={st.guestT}>Continuar como invitado</Text>
      </Pressable>
      <Text style={st.quote}>"Every conversation is a step toward confidence."</Text>
      <Text style={st.fine}>LEARN, SPEAK, GROW</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, padding: 26, justifyContent: 'center', backgroundColor: C.paper, gap: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 26 },
  mark: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  markT: { color: '#fff', fontWeight: '800', fontSize: 12 },
  brandT: { fontSize: 17, fontWeight: '800', color: C.navy },
  eyebrow: { fontSize: T.eyebrow, letterSpacing: 1, color: C.muted, fontWeight: '600' },
  h1: { fontSize: 37, fontWeight: '800', color: C.navy, lineHeight: 38 },
  sub: { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 14 },
  google: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line, borderRadius: 15, padding: 15 },
  g: { fontSize: 17, fontWeight: '800', color: '#3978a8' },
  gtext: { fontWeight: '700', color: C.ink, fontSize: 13 },
  dim: { opacity: 0.5 },
  error: { color: C.danger, fontSize: 12, textAlign: 'center' },
  div: { alignItems: 'center', marginTop: 8 },
  divT: { fontSize: 10, color: C.muted },
  guest: { padding: 13, alignItems: 'center' },
  guestT: { fontWeight: '700', color: C.blue },
  quote: { fontStyle: 'italic', fontSize: 15, color: C.navy, textAlign: 'center', marginTop: 22, lineHeight: 22 },
  fine: { textAlign: 'center', fontSize: 9, letterSpacing: 1, color: C.teal, fontWeight: '600' },
});
