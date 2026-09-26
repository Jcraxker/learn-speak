import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, T } from '../theme';
import { getStats } from '../lib/stats';

// Profile + stats + plan + LOG OUT.
export default function Profile({ user, pro, openPaywall, onLogout, nivel }) {
  const [s, setS] = useState({ sessions: 0, minutes: 0 });
  useEffect(() => {
    (async () => setS(await getStats()))();
  }, []);
  const initial = (user?.name || 'G').slice(0, 1).toUpperCase();
  return (
    <View style={st.wrap}>
      <Text style={st.eyebrow}>YOUR SPACE</Text>
      <Text style={st.h1}>Profile &{'\n'}preferences.</Text>
      <View style={st.card}>
        <View style={st.avatar}>
          <Text style={st.avatarT}>{initial}</Text>
        </View>
        <View style={st.who}>
          <Text style={st.name}>{user?.guest ? 'Invitado' : user?.name || 'Learner'}</Text>
          <Text style={st.sub}>{user?.email || (nivel ? `Nivel ${nivel}` : 'Nivel por elegir')}</Text>
        </View>
      </View>
      <View style={st.nums}>
        <Text style={st.n}>{s.sessions}<Text style={st.nl}>{"\n"}Conversations</Text></Text>
        <Text style={st.n}>{s.minutes}m<Text style={st.nl}>{"\n"}Practice time</Text></Text>
        <Text style={[st.n, st.last]}>{pro ? 'Pro' : 'Free'}<Text style={st.nl}>{"\n"}Plan</Text></Text>
      </View>
      <Pressable style={st.plan} onPress={openPaywall}>
        <Text style={st.planT}>{pro ? '★ Pro active' : '✦ Free practice'}</Text>
        <Text style={st.planS}>{pro ? 'Sesiones ilimitadas' : '1 conversacion al dia — ver Pro'}</Text>
      </Pressable>
      <Pressable style={st.logout} onPress={onLogout}>
        <Text style={stylesLogout}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const stylesLogout = { color: C.danger, fontWeight: '700', fontSize: T.body };

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper, padding: 20, gap: 12 },
  eyebrow: { fontSize: T.eyebrow, letterSpacing: 1, color: C.muted, fontWeight: '600' },
  h1: { fontSize: 30, fontWeight: '800', color: C.navy, lineHeight: 32 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 15 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  avatarT: { color: '#fff', fontWeight: '700', fontSize: 18 },
  who: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: C.ink },
  sub: { fontSize: 11, color: C.muted, marginTop: 3 },
  nums: { flexDirection: 'row', marginVertical: 4 },
  n: { flex: 1, fontSize: 16, fontWeight: '800', color: C.navy, borderRightWidth: 1, borderColor: C.line, paddingLeft: 10 },
  last: { borderRightWidth: 0 },
  nl: { fontSize: 9, color: C.muted, fontWeight: '400' },
  plan: { backgroundColor: C.goldPale, borderRadius: 15, padding: 14 },
  planT: { fontWeight: '800', color: '#765a28', fontSize: 13 },
  planS: { fontSize: 10, color: '#765a28', marginTop: 3 },
  logout: { borderWidth: 1.5, borderColor: C.danger, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 6 },
});
